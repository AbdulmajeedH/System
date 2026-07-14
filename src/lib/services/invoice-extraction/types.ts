/**
 * Provider-agnostic contract for extracting purchase-invoice data from an
 * uploaded image or PDF. Providers return the *raw* fields they read from the
 * document; they have no knowledge of the local database. Matching extracted
 * names against known suppliers/items happens in the server action, never here.
 *
 * IMPORTANT: Extraction never mutates inventory or saves any record. Results
 * are only ever pre-filled into a form for a human to review and confirm.
 */

export type ExtractionSource = {
  /** Raw file bytes. */
  data: Buffer;
  /** One of the SUPPORTED_MIME_TYPES values. */
  mimeType: string;
};

export type RawExtractedLine = {
  /** Item name exactly as printed on the invoice (Arabic or English). */
  name: string;
  /** Quantity purchased, in the unit printed on the invoice. */
  quantity: number | null;
  /** Unit label as printed (e.g. "كرتون", "كجم", "piece") if present. */
  unit: string | null;
  /** Price of a single unit before line-level tax/discount, if present. */
  unitPrice: number | null;
  /** Line total as printed, if present. */
  lineTotal: number | null;
};

export type RawExtractedInvoice = {
  supplierName: string | null;
  invoiceNumber: string | null;
  /** ISO date (YYYY-MM-DD) if a date could be read, otherwise null. */
  invoiceDate: string | null;
  /** Currency code/label as printed, if any. */
  currency: string | null;
  /** Sum before VAT, if printed. */
  subtotal: number | null;
  /** VAT amount, if printed. */
  vat: number | null;
  /** Final total after VAT, if printed. */
  grandTotal: number | null;
  lines: RawExtractedLine[];
};

export interface InvoiceExtractionProvider {
  /** Stable identifier for logging/audit (e.g. "claude", "mock"). */
  readonly name: string;
  extract(source: ExtractionSource): Promise<RawExtractedInvoice>;
}

export class InvoiceExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceExtractionError";
  }
}

export const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const MAX_EXTRACTION_BYTES = 10 * 1024 * 1024; // 10 MB
