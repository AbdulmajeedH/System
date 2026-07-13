"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { ApprovalTransactionType, Role } from "@/generated/prisma/enums";
import { actionPermission, actionUser, ForbiddenError } from "@/lib/auth/guards";
import { audit } from "@/lib/services/audit";
import { fieldErrorsFromZod, unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

// ---------------------------------------------------------------------------
// General settings (SystemSetting)
// ---------------------------------------------------------------------------

const generalSettingsSchema = z.object({
  "attendance.workday_start": z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, t.settings.invalidTime),
  "attendance.late_after_minutes": z.coerce.number().int().min(0).max(240),
  "attendance.max_break_minutes": z.coerce.number().int().min(5).max(480),
  "inventory.low_stock_alerts": z.enum(["1", "0"]),
});

export async function updateGeneralSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("settings.manage");

  const parsed = generalSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);

  for (const [key, value] of Object.entries(parsed.data)) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  await audit({
    userId: user.id,
    action: "settings.update",
    entityType: "SystemSetting",
    metadata: parsed.data,
  });

  revalidatePath("/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Approval rules
// ---------------------------------------------------------------------------

const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const ruleSchema = z
  .object({
    transactionType: z.enum(
      Object.values(ApprovalTransactionType) as [ApprovalTransactionType, ...ApprovalTransactionType[]],
    ),
    minAmount: money,
    maxAmount: money,
    departmentId: z
      .string()
      .optional()
      .transform((v) => (v ? v : null)),
    requiredRole: z.enum(Object.values(Role) as [Role, ...Role[]]),
    level: z.coerce.number().int().min(1).max(5).default(1),
  })
  .refine(
    (r) => r.minAmount === null || r.maxAmount === null || Number(r.minAmount) < Number(r.maxAmount),
    { message: t.income.invalidAmount, path: ["maxAmount"] },
  );

export async function saveApprovalRule(
  ruleId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("settings.manage");

  const parsed = ruleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);
  const data = parsed.data;

  const values = {
    transactionType: data.transactionType,
    minAmount: data.minAmount ? new Prisma.Decimal(data.minAmount) : null,
    maxAmount: data.maxAmount ? new Prisma.Decimal(data.maxAmount) : null,
    departmentId: data.departmentId,
    requiredRole: data.requiredRole,
    level: data.level,
  };

  const rule = ruleId
    ? await prisma.approvalRule.update({ where: { id: ruleId }, data: values })
    : await prisma.approvalRule.create({ data: values });

  await audit({
    userId: user.id,
    action: ruleId ? "settings.rule_update" : "settings.rule_create",
    entityType: "ApprovalRule",
    entityId: rule.id,
    metadata: { transactionType: data.transactionType, requiredRole: data.requiredRole },
  });

  revalidatePath("/settings/approval-rules");
  return { success: true };
}

export async function setApprovalRuleActive(ruleId: string, isActive: boolean): Promise<FormState> {
  const user = await actionPermission("settings.manage");
  await prisma.approvalRule.update({ where: { id: ruleId }, data: { isActive } });
  await audit({
    userId: user.id,
    action: isActive ? "settings.rule_activate" : "settings.rule_deactivate",
    entityType: "ApprovalRule",
    entityId: ruleId,
  });
  revalidatePath("/settings/approval-rules");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Expense categories
// ---------------------------------------------------------------------------

export async function saveExpenseCategory(
  categoryId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("settings.manage");

  const nameAr = String(formData.get("nameAr") ?? "").trim();
  if (nameAr.length < 2 || nameAr.length > 100) {
    return { fieldErrors: { nameAr: t.common.required } };
  }

  const duplicate = await prisma.expenseCategory.findFirst({
    where: { nameAr, ...(categoryId ? { id: { not: categoryId } } : {}) },
  });
  if (duplicate) return { fieldErrors: { nameAr: t.settings.categoryExists } };

  const category = categoryId
    ? await prisma.expenseCategory.update({ where: { id: categoryId }, data: { nameAr } })
    : await prisma.expenseCategory.create({ data: { nameAr } });

  await audit({
    userId: user.id,
    action: categoryId ? "settings.category_update" : "settings.category_create",
    entityType: "ExpenseCategory",
    entityId: category.id,
    metadata: { nameAr },
  });

  revalidatePath("/settings/expense-categories");
  return { success: true };
}

export async function setExpenseCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<FormState> {
  const user = await actionPermission("settings.manage");
  await prisma.expenseCategory.update({ where: { id: categoryId }, data: { isActive } });
  await audit({
    userId: user.id,
    action: isActive ? "settings.category_activate" : "settings.category_deactivate",
    entityType: "ExpenseCategory",
    entityId: categoryId,
  });
  revalidatePath("/settings/expense-categories");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Important products (owner via settings.manage OR the department's manager)
// ---------------------------------------------------------------------------

async function importantProductUser(departmentId: string) {
  const user = await actionUser();
  const isAdmin = user.role === Role.OWNER || user.role === Role.GENERAL_MANAGER;
  const isOwnManager =
    user.role === Role.DEPARTMENT_MANAGER && user.departmentId === departmentId;
  if (!isAdmin && !isOwnManager) throw new ForbiddenError(t.settings.onlyOwnDepartment);
  return user;
}

export async function saveImportantProduct(
  productId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const departmentId = String(formData.get("departmentId") ?? "");
  const nameAr = String(formData.get("nameAr") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!departmentId || nameAr.length < 2 || nameAr.length > 200 || !Number.isInteger(sortOrder)) {
    return { fieldErrors: { nameAr: t.common.required } };
  }

  let user;
  try {
    user = await importantProductUser(departmentId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const product = productId
    ? await prisma.importantProduct.update({
        where: { id: productId },
        data: { nameAr, sortOrder },
      })
    : await prisma.importantProduct.create({ data: { departmentId, nameAr, sortOrder } });

  await audit({
    userId: user.id,
    action: productId ? "settings.product_update" : "settings.product_create",
    entityType: "ImportantProduct",
    entityId: product.id,
    metadata: { departmentId, nameAr, sortOrder },
  });

  revalidatePath("/settings/important-products");
  return { success: true };
}

export async function setImportantProductActive(
  productId: string,
  isActive: boolean,
): Promise<FormState> {
  const product = await prisma.importantProduct.findUnique({ where: { id: productId } });
  if (!product) return unknownError();

  let user;
  try {
    user = await importantProductUser(product.departmentId);
  } catch (error) {
    return { error: (error as Error).message };
  }

  await prisma.importantProduct.update({ where: { id: productId }, data: { isActive } });
  await audit({
    userId: user.id,
    action: isActive ? "settings.product_activate" : "settings.product_deactivate",
    entityType: "ImportantProduct",
    entityId: productId,
  });
  revalidatePath("/settings/important-products");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Units and conversions
// ---------------------------------------------------------------------------

export async function createUnit(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionPermission("settings.manage");

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const nameAr = String(formData.get("nameAr") ?? "").trim();
  if (!/^[A-Z0-9_]{1,20}$/.test(code) || nameAr.length < 1 || nameAr.length > 50) {
    return { fieldErrors: { code: t.common.required } };
  }

  const exists = await prisma.unitDef.findUnique({ where: { code } });
  if (exists) return { fieldErrors: { code: t.settings.unitExists } };

  const unit = await prisma.unitDef.create({ data: { code, nameAr } });
  await audit({
    userId: user.id,
    action: "settings.unit_create",
    entityType: "UnitDef",
    entityId: unit.id,
    metadata: { code, nameAr },
  });

  revalidatePath("/settings/units");
  return { success: true };
}

export async function createConversion(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionPermission("settings.manage");

  const fromUnitId = String(formData.get("fromUnitId") ?? "");
  const toUnitId = String(formData.get("toUnitId") ?? "");
  const factorRaw = String(formData.get("factor") ?? "").trim();

  if (!fromUnitId || !toUnitId) return { error: t.common.required };
  if (fromUnitId === toUnitId) {
    return { fieldErrors: { toUnitId: t.settings.conversionSameUnit } };
  }
  if (!/^\d{1,8}(\.\d{1,4})?$/.test(factorRaw) || Number(factorRaw) <= 0) {
    return { fieldErrors: { factor: t.income.invalidAmount } };
  }

  // A pair may only exist once in either direction — the reverse factor is
  // derivable and a second row would allow inconsistent cycles.
  const existing = await prisma.unitConversion.findFirst({
    where: {
      OR: [
        { fromUnitId, toUnitId },
        { fromUnitId: toUnitId, toUnitId: fromUnitId },
      ],
    },
  });
  if (existing) return { fieldErrors: { toUnitId: t.settings.conversionExists } };

  const conversion = await prisma.unitConversion.create({
    data: { fromUnitId, toUnitId, factor: new Prisma.Decimal(factorRaw) },
  });
  await audit({
    userId: user.id,
    action: "settings.conversion_create",
    entityType: "UnitConversion",
    entityId: conversion.id,
    metadata: { fromUnitId, toUnitId, factor: factorRaw },
  });

  revalidatePath("/settings/units");
  return { success: true };
}
