import { z } from "zod";
import { RequestPriority } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";

const qty = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,3})?$/, t.income.invalidAmount);

export const stockRequestFormSchema = z.object({
  departmentId: z.string().min(1, t.common.required),
  requiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.common.required),
  priority: z.enum(Object.values(RequestPriority) as [RequestPriority, ...RequestPriority[]]),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        requestedQty: qty.refine((v) => Number(v) > 0, t.income.invalidAmount),
      }),
    )
    .min(1, t.stockRequests.needsOneItem),
});
