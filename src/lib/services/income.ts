// Pure calculation logic for daily income submissions (unit-tested).
import { Prisma } from "../../generated/prisma/client";

const Decimal = Prisma.Decimal;

export type IncomeAmounts = {
  cashIncome: Prisma.Decimal | string | number;
  cardIncome: Prisma.Decimal | string | number;
  bankTransferIncome: Prisma.Decimal | string | number;
  deliveryAppsIncome: Prisma.Decimal | string | number;
  otherIncome: Prisma.Decimal | string | number;
  cashExpenses: Prisma.Decimal | string | number;
  cashRefunds: Prisma.Decimal | string | number;
  actualDelivered: Prisma.Decimal | string | number;
};

export type IncomeTotals = {
  totalIncome: Prisma.Decimal;
  netIncome: Prisma.Decimal;
  expectedCash: Prisma.Decimal;
  cashDifference: Prisma.Decimal;
};

/**
 * totalIncome   = cash + card + bank transfer + delivery apps + other
 * netIncome     = totalIncome - cashExpenses
 * expectedCash  = cashIncome - cashExpenses - cashRefunds
 * cashDifference = actualDelivered - expectedCash
 */
export function computeIncomeTotals(input: IncomeAmounts): IncomeTotals {
  const cash = new Decimal(input.cashIncome);
  const card = new Decimal(input.cardIncome);
  const bank = new Decimal(input.bankTransferIncome);
  const delivery = new Decimal(input.deliveryAppsIncome);
  const other = new Decimal(input.otherIncome);
  const expenses = new Decimal(input.cashExpenses);
  const refunds = new Decimal(input.cashRefunds);
  const actual = new Decimal(input.actualDelivered);

  const totalIncome = cash.add(card).add(bank).add(delivery).add(other);
  const netIncome = totalIncome.sub(expenses);
  const expectedCash = cash.sub(expenses).sub(refunds);
  const cashDifference = actual.sub(expectedCash);

  return { totalIncome, netIncome, expectedCash, cashDifference };
}
