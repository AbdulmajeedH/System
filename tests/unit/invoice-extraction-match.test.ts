import { describe, expect, it } from "vitest";
import {
  bestMatch,
  normalizeName,
  type MatchCandidate,
} from "../../src/lib/services/invoice-extraction/match";

describe("normalizeName", () => {
  it("unifies Arabic letter variants and strips diacritics", () => {
    expect(normalizeName("طَماطِم")).toBe(normalizeName("طماطم"));
    expect(normalizeName("مياة")).toBe(normalizeName("مياه")); // ة -> ه
    expect(normalizeName("أرز")).toBe(normalizeName("ارز")); // أ -> ا
  });

  it("lowercases latin and collapses punctuation/whitespace", () => {
    expect(normalizeName("Coca-Cola  1.5L")).toBe("coca cola 1 5l");
  });
});

describe("bestMatch", () => {
  const items: MatchCandidate[] = [
    { id: "rice", names: ["أرز بسمتي", "Basmati Rice", "RICE-01"] },
    { id: "oil", names: ["زيت دوار الشمس", "Sunflower Oil"] },
    { id: "sugar", names: ["سكر ابيض", "White Sugar"] },
  ];

  it("matches on exact normalized Arabic name", () => {
    expect(bestMatch("ارز بسمتي", items)?.id).toBe("rice");
  });

  it("matches when the invoice name is a superset/subset", () => {
    expect(bestMatch("زيت دوار الشمس ٥ لتر", items)?.id).toBe("oil");
  });

  it("matches on the English alias and SKU", () => {
    expect(bestMatch("Basmati Rice", items)?.id).toBe("rice");
    expect(bestMatch("RICE-01", items)?.id).toBe("rice");
  });

  it("returns null when nothing clears the threshold", () => {
    expect(bestMatch("منتج غير موجود تماماً", items)).toBeNull();
    expect(bestMatch("", items)).toBeNull();
  });

  it("picks the highest-scoring candidate", () => {
    const match = bestMatch("سكر", items);
    expect(match?.id).toBe("sugar");
  });
});
