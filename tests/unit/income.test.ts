import { describe, expect, it } from "vitest";
import { computeIncomeTotals } from "../../src/lib/services/income";

describe("computeIncomeTotals", () => {
  it("computes the daily closing figures", () => {
    const totals = computeIncomeTotals({
      cashIncome: "2500",
      cardIncome: "1800",
      bankTransferIncome: "300",
      deliveryAppsIncome: "650",
      otherIncome: "50",
      cashExpenses: "120",
      cashRefunds: "30",
      actualDelivered: "2350",
    });
    expect(totals.totalIncome.toString()).toBe("5300");
    expect(totals.netIncome.toString()).toBe("5180");
    expect(totals.expectedCash.toString()).toBe("2350");
    expect(totals.cashDifference.toString()).toBe("0");
  });

  it("flags shortages as negative differences", () => {
    const totals = computeIncomeTotals({
      cashIncome: "1000",
      cardIncome: "0",
      bankTransferIncome: "0",
      deliveryAppsIncome: "0",
      otherIncome: "0",
      cashExpenses: "100",
      cashRefunds: "0",
      actualDelivered: "870",
    });
    expect(totals.expectedCash.toString()).toBe("900");
    expect(totals.cashDifference.toString()).toBe("-30");
  });

  it("keeps decimal precision (no float artifacts)", () => {
    const totals = computeIncomeTotals({
      cashIncome: "0.1",
      cardIncome: "0.2",
      bankTransferIncome: "0",
      deliveryAppsIncome: "0",
      otherIncome: "0",
      cashExpenses: "0",
      cashRefunds: "0",
      actualDelivered: "0.1",
    });
    expect(totals.totalIncome.toString()).toBe("0.3"); // not 0.30000000000000004
    expect(totals.expectedCash.toString()).toBe("0.1");
    expect(totals.cashDifference.toString()).toBe("0");
  });
});
