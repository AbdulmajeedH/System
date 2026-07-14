/**
 * Pure fuzzy-matching helpers for reconciling names read off an invoice
 * against the local inventory-item and supplier master data. These functions
 * never touch the database — the caller supplies candidate names — so they can
 * be unit tested in isolation.
 *
 * A match is only a suggestion: the human always confirms (or corrects) the
 * selection in the form before anything is saved.
 */

/**
 * Normalizes Arabic/English text for comparison: strips tatweel and Arabic
 * diacritics, unifies alef/hamza/ya/ta-marbuta variants, lowercases Latin,
 * and collapses whitespace/punctuation.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[ـ]/g, "") // tatweel
    .replace(/[ً-ْٰ]/g, "") // harakat / superscript alef
    .replace(/[آأإٱ]/g, "ا") // alef variants -> ا
    .replace(/ة/g, "ه") // ة -> ه
    .replace(/ى/g, "ي") // ى -> ي
    .replace(/ؤ/g, "و") // ؤ -> و
    .replace(/ئ/g, "ي") // ئ -> ي
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalizeName(value).split(" ").filter(Boolean);
}

/** Jaccard-style token overlap in [0,1]. */
function tokenScore(a: string, b: string): number {
  const at = new Set(tokens(a));
  const bt = new Set(tokens(b));
  if (at.size === 0 || bt.size === 0) return 0;
  let shared = 0;
  for (const token of at) if (bt.has(token)) shared += 1;
  return shared / Math.max(at.size, bt.size);
}

export type MatchCandidate = { id: string; names: string[] };

export type MatchResult = { id: string; score: number };

/**
 * Returns the best-matching candidate for `query`, or null when no candidate
 * clears `threshold`. Scoring: exact normalized equality = 1; one name fully
 * contains the other = 0.9; otherwise token overlap.
 */
export function bestMatch(
  query: string,
  candidates: MatchCandidate[],
  threshold = 0.5,
): MatchResult | null {
  const q = normalizeName(query);
  if (!q) return null;

  let best: MatchResult | null = null;
  for (const candidate of candidates) {
    let score = 0;
    for (const rawName of candidate.names) {
      const name = normalizeName(rawName);
      if (!name) continue;
      let s: number;
      if (name === q) s = 1;
      else if (name.includes(q) || q.includes(name)) s = 0.9;
      else s = tokenScore(query, rawName);
      if (s > score) score = s;
    }
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: candidate.id, score };
    }
  }
  return best;
}
