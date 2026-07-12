import { z } from "zod";
import { PaymentMethod } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";

export const expenseFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.common.required),
  departmentId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  categoryId: z.string().min(1, t.common.required),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, t.income.invalidAmount)
    .refine((v) => Number(v) > 0, t.income.invalidAmount),
  paymentMethod: z.enum(Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]]),
  description: z.string().trim().min(2, t.common.required).max(500),
  supplierId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
});
