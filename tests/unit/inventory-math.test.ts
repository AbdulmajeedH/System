import { describe, expect, it } from "vitest";
import { Prisma } from "../../src/generated/prisma/client";
import { movingAverageCost, toBaseQty } from "../../src/lib/services/inventory";

const D = (v: string) => new Prisma.Decimal(v);

describe("toBaseQty", () => {
  it("converts purchase units to base units", () => {
    expect(toBaseQty("3", "24").toString()).toBe("72"); // 3 cartons of 24
    expect(toBaseQty("2.5", "10").toString()).toBe("25"); // 2.5 bags of 10 kg
    expect(toBaseQty("7", "1").toString()).toBe("7");
  });
});

describe("movingAverageCost", () => {
  it("averages existing stock with the received batch", () => {
    // 100 units @ 2.00 + 50 units @ 3.50 → (200 + 175) / 150 = 2.5
    const avg = movingAverageCost(D("100"), D("2"), D("50"), D("3.5"));
    expect(avg.toString()).toBe("2.5");
  });

  it("uses the received cost when nothing is on hand", () => {
    expect(movingAverageCost(D("0"), D("0"), D("40"), D("1.25")).toString()).toBe("1.25");
  });

  it("ignores negative on-hand quantities", () => {
    expect(movingAverageCost(D("-10"), D("2"), D("40"), D("3")).toString()).toBe("3");
  });
});
