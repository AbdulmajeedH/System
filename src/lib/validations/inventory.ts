import { z } from "zod";
import { t } from "@/lib/i18n/ar";

const decimalStr = (pattern: RegExp) =>
  z.string().trim().regex(pattern, t.income.invalidAmount);

const qty = decimalStr(/^\d{1,10}(\.\d{1,3})?$/);
const price = decimalStr(/^\d{1,10}(\.\d{1,4})?$/);

const optional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const itemFormSchema = z.object({
  nameAr: z.string().trim().min(2, t.common.required).max(200),
  nameEn: optional(),
  sku: z.string().trim().min(1, t.common.required).max(50),
  barcode: optional(50),
  categoryId: optional(),
  baseUnitId: z.string().min(1, t.common.required),
  purchaseUnitId: z.string().min(1, t.common.required),
  conversionFactor: price.refine((v) => Number(v) > 0, t.income.invalidAmount),
  currentPrice: price,
  minStock: qty,
  reorderLevel: qty,
  preferredSupplierId: optional(),
  storageLocation: optional(),
  expiryTracking: z.coerce.boolean().default(false),
  notes: optional(1000),
});

export const categoryFormSchema = z.object({
  nameAr: z.string().trim().min(2, t.common.required).max(100),
  parentId: optional(),
});

export const supplierFormSchema = z.object({
  nameAr: z.string().trim().min(2, t.common.required).max(200),
  contactPerson: optional(),
  phone: optional(30),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  taxNumber: optional(30),
  address: optional(500),
  categories: optional(),
  paymentTerms: optional(),
  notes: optional(1000),
});

const invoiceLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: qty.refine((v) => Number(v) > 0, t.income.invalidAmount),
  unitPrice: price,
  discount: price.default("0"),
  tax: price.default("0"),
});

export const invoiceFormSchema = z.object({
  supplierId: z.string().min(1, t.common.required),
  invoiceNumber: z.string().trim().min(1, t.common.required).max(60),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.common.required),
  paymentMethod: z.string().min(1),
  vat: price.default("0"),
  notes: optional(1000),
  lines: z.array(invoiceLineSchema).min(1, t.invoices.needsOneItem),
});

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
