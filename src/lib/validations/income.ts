import { z } from "zod";
import { ShiftType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";

/** "12", "12.5", "12.50" — nonnegative money amount as a string. */
const money = z
  .string()
  .trim()
  .default("0")
  .transform((v) => (v === "" ? "0" : v))
  .pipe(z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, t.income.invalidAmount));

export const incomeFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.common.required),
  shiftType: z.enum(Object.values(ShiftType) as [ShiftType, ...ShiftType[]]),
  departmentId: z.string().min(1, t.common.required),
  cashIncome: money,
  cardIncome: money,
  bankTransferIncome: money,
  deliveryAppsIncome: money,
  otherIncome: money,
  cashExpenses: money,
  cashRefunds: money,
  actualDelivered: money,
  differenceReason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  isException: z.coerce.boolean().default(false),
});

export type IncomeFormInput = z.infer<typeof incomeFormSchema>;

export const reviewDecisionSchema = z.object({
  comment: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});
