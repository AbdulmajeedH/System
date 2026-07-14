import "server-only";
import { ClaudeInvoiceExtractionProvider } from "./claude";
import { MockInvoiceExtractionProvider } from "./mock";
import type { InvoiceExtractionProvider } from "./types";

export * from "./types";

let provider: InvoiceExtractionProvider | null = null;

/** True when a real AI extraction backend is configured. */
export function isExtractionConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/**
 * Returns the active extraction provider. Uses Claude when ANTHROPIC_API_KEY is
 * set; otherwise falls back to the deterministic mock so the feature degrades
 * gracefully instead of erroring in environments without AI credentials.
 */
export function getInvoiceExtractionProvider(): InvoiceExtractionProvider {
  if (!provider) {
    provider = isExtractionConfigured()
      ? new ClaudeInvoiceExtractionProvider()
      : new MockInvoiceExtractionProvider();
  }
  return provider;
}

/** Test helper: clears the memoized provider. */
export function resetInvoiceExtractionForTests(): void {
  provider = null;
}
