"use server";

import { prisma } from "@/lib/db";
import { actionPermission } from "@/lib/auth/guards";
import { audit } from "@/lib/services/audit";
import {
  getInvoiceExtractionProvider,
  InvoiceExtractionError,
  MAX_EXTRACTION_BYTES,
  SUPPORTED_MIME_TYPES,
} from "@/lib/services/invoice-extraction";
import { bestMatch, type MatchCandidate } from "@/lib/services/invoice-extraction/match";
import { t } from "@/lib/i18n/ar";

export type ExtractedLineDraft = {
  /** Matched inventory item id, or "" when no confident match was found. */
  itemId: string;
  /** Raw item name read from the invoice (shown to help the human pick). */
  rawName: string;
  quantity: string;
  unitPrice: string;
  matched: boolean;
};

export type InvoiceExtractionDraft = {
  supplierId: string;
  supplierName: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  vat: string;
  lines: ExtractedLineDraft[];
  grandTotal: string | null;
  matchedLines: number;
  totalLines: number;
};

export type ExtractionActionResult =
  | { ok: true; draft: InvoiceExtractionDraft }
  | { ok: false; error: string };

function num(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "0";
  return String(value);
}

/**
 * Reads a supplier invoice image/PDF with the AI extraction provider and
 * returns a DRAFT to pre-fill the invoice form. This never creates an invoice,
 * never posts inventory movements, and never trusts the result — a human must
 * review and confirm every field before saving through the normal flow.
 */
export async function extractInvoiceFromImage(
  formData: FormData,
): Promise<ExtractionActionResult> {
  const user = await actionPermission("invoice.manage");

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: t.invoices.extract.noImage };
  }
  if (!SUPPORTED_MIME_TYPES.includes(file.type as (typeof SUPPORTED_MIME_TYPES)[number])) {
    return { ok: false, error: t.invoices.extract.unsupported };
  }
  if (file.size > MAX_EXTRACTION_BYTES) {
    return { ok: false, error: t.invoices.extract.tooLarge };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const provider = getInvoiceExtractionProvider();

  let raw;
  try {
    raw = await provider.extract({ data: buffer, mimeType: file.type });
  } catch (error) {
    if (error instanceof InvoiceExtractionError) {
      return { ok: false, error: t.invoices.extract.failed };
    }
    throw error;
  }

  // Load active master data to reconcile the extracted names against.
  const [suppliers, items] = await Promise.all([
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, nameEn: true, sku: true },
    }),
  ]);

  const supplierCandidates: MatchCandidate[] = suppliers.map((s) => ({
    id: s.id,
    names: [s.nameAr],
  }));
  const itemCandidates: MatchCandidate[] = items.map((i) => ({
    id: i.id,
    names: [i.nameAr, i.nameEn, i.sku].filter((n): n is string => Boolean(n)),
  }));

  const supplierMatch = raw.supplierName
    ? bestMatch(raw.supplierName, supplierCandidates, 0.6)
    : null;

  const lines: ExtractedLineDraft[] = raw.lines.map((line) => {
    const match = bestMatch(line.name, itemCandidates, 0.5);
    return {
      itemId: match?.id ?? "",
      rawName: line.name,
      quantity: line.quantity && line.quantity > 0 ? num(line.quantity) : "1",
      unitPrice: num(line.unitPrice),
      matched: Boolean(match),
    };
  });

  const draft: InvoiceExtractionDraft = {
    supplierId: supplierMatch?.id ?? "",
    supplierName: raw.supplierName,
    invoiceNumber: raw.invoiceNumber ?? "",
    invoiceDate: raw.invoiceDate ?? "",
    vat: num(raw.vat),
    lines,
    grandTotal: raw.grandTotal !== null ? num(raw.grandTotal) : null,
    matchedLines: lines.filter((l) => l.matched).length,
    totalLines: lines.length,
  };

  await audit({
    userId: user.id,
    action: "invoice.ai_extract",
    entityType: "PurchaseInvoice",
    entityId: "draft",
    metadata: {
      provider: provider.name,
      matchedLines: draft.matchedLines,
      totalLines: draft.totalLines,
      supplierMatched: Boolean(draft.supplierId),
    },
  });

  return { ok: true, draft };
}
