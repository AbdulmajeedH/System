import type {
  ExtractionSource,
  InvoiceExtractionProvider,
  RawExtractedInvoice,
} from "./types";

/**
 * Deterministic provider used when ANTHROPIC_API_KEY is not configured (local
 * development, tests, or preview environments without AI credentials). It does
 * not call any external service; it returns a small sample invoice so the
 * review-and-confirm flow can be exercised end to end without an API key.
 */
export class MockInvoiceExtractionProvider implements InvoiceExtractionProvider {
  readonly name = "mock";

  async extract(_source: ExtractionSource): Promise<RawExtractedInvoice> {
    return {
      supplierName: "مورد تجريبي",
      invoiceNumber: "DEMO-0001",
      invoiceDate: new Date().toISOString().slice(0, 10),
      currency: "SAR",
      subtotal: 100,
      vat: 15,
      grandTotal: 115,
      lines: [
        { name: "صنف تجريبي ١", quantity: 2, unit: "كرتون", unitPrice: 25, lineTotal: 50 },
        { name: "صنف تجريبي ٢", quantity: 5, unit: "كجم", unitPrice: 10, lineTotal: 50 },
      ],
    };
  }
}
