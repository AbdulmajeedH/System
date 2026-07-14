import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  InvoiceExtractionError,
  type ExtractionSource,
  type InvoiceExtractionProvider,
  type RawExtractedInvoice,
} from "./types";

/**
 * Extracts invoice data from an image/PDF using Claude vision.
 *
 * The API key is read from ANTHROPIC_API_KEY on the server only and is never
 * exposed to the client. A forced tool call is used so the model returns a
 * strictly-shaped JSON object instead of free-form prose.
 */
export class ClaudeInvoiceExtractionProvider implements InvoiceExtractionProvider {
  readonly name = "claude";
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.client = new Anthropic(
      options?.apiKey ? { apiKey: options.apiKey } : undefined,
    );
    this.model = options?.model ?? process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
  }

  async extract(source: ExtractionSource): Promise<RawExtractedInvoice> {
    const base64 = source.data.toString("base64");
    const documentBlock =
      source.mimeType === "application/pdf"
        ? {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          }
        : {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: source.mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/webp"
                | "image/gif",
              data: base64,
            },
          };

    let message;
    try {
      message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        tools: [
          {
            name: "record_invoice",
            description:
              "Record the structured data read from a supplier purchase invoice.",
            input_schema: INVOICE_TOOL_SCHEMA,
          },
        ],
        tool_choice: { type: "tool", name: "record_invoice" },
        messages: [
          {
            role: "user",
            content: [
              documentBlock,
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      });
    } catch (error) {
      throw new InvoiceExtractionError(
        error instanceof Error ? error.message : "Claude request failed",
      );
    }

    const toolUse = message.content.find(
      (block): block is Extract<typeof block, { type: "tool_use" }> =>
        block.type === "tool_use",
    );
    if (!toolUse) {
      throw new InvoiceExtractionError("No structured result returned by the model");
    }

    return normalize(toolUse.input as Record<string, unknown>);
  }
}

const EXTRACTION_PROMPT = [
  "You are reading a supplier purchase invoice for a restaurant/café/mini-market.",
  "The invoice may be in Arabic or English. Extract exactly what is printed.",
  "For each line item, capture the item name, quantity, its unit, the unit price, and the line total when shown.",
  "Also capture the supplier name, invoice number, invoice date, the subtotal before VAT, the VAT amount, and the final total after VAT.",
  "Return the invoice date as YYYY-MM-DD. Use null for any value that is not clearly present — never guess a number.",
  "Do not invent line items that are not on the invoice.",
].join(" ");

const INVOICE_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    supplierName: { type: ["string", "null"] },
    invoiceNumber: { type: ["string", "null"] },
    invoiceDate: {
      type: ["string", "null"],
      description: "ISO date, format YYYY-MM-DD",
    },
    currency: { type: ["string", "null"] },
    subtotal: { type: ["number", "null"], description: "Sum before VAT" },
    vat: { type: ["number", "null"], description: "VAT amount" },
    grandTotal: { type: ["number", "null"], description: "Final total after VAT" },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          unitPrice: { type: ["number", "null"] },
          lineTotal: { type: ["number", "null"] },
        },
        required: ["name"],
      },
    },
  },
  required: ["lines"],
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalize(input: Record<string, unknown>): RawExtractedInvoice {
  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  const lines = rawLines
    .map((line) => {
      const l = (line ?? {}) as Record<string, unknown>;
      const name = asString(l.name);
      if (!name) return null;
      return {
        name,
        quantity: asNumber(l.quantity),
        unit: asString(l.unit),
        unitPrice: asNumber(l.unitPrice),
        lineTotal: asNumber(l.lineTotal),
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  return {
    supplierName: asString(input.supplierName),
    invoiceNumber: asString(input.invoiceNumber),
    invoiceDate: normalizeDate(asString(input.invoiceDate)),
    currency: asString(input.currency),
    subtotal: asNumber(input.subtotal),
    vat: asNumber(input.vat),
    grandTotal: asNumber(input.grandTotal),
    lines,
  };
}

/** Keep only well-formed YYYY-MM-DD dates; drop anything else. */
function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}
