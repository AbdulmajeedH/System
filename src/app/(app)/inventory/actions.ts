"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { actionPermission } from "@/lib/auth/guards";
import { audit } from "@/lib/services/audit";
import { categoryFormSchema, itemFormSchema } from "@/lib/validations/inventory";
import { fieldErrorsFromZod, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

export async function saveItem(
  itemId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("inventory.manageItems");

  const parsed = itemFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);
  const data = parsed.data;

  const skuTaken = await prisma.inventoryItem.findFirst({
    where: { sku: data.sku, ...(itemId ? { id: { not: itemId } } : {}) },
  });
  if (skuTaken) return { fieldErrors: { sku: t.inventory.skuExists } };

  const values = {
    nameAr: data.nameAr,
    nameEn: data.nameEn,
    sku: data.sku,
    barcode: data.barcode,
    categoryId: data.categoryId,
    baseUnitId: data.baseUnitId,
    purchaseUnitId: data.purchaseUnitId,
    conversionFactor: new Prisma.Decimal(data.conversionFactor),
    currentPrice: new Prisma.Decimal(data.currentPrice),
    minStock: new Prisma.Decimal(data.minStock),
    reorderLevel: new Prisma.Decimal(data.reorderLevel),
    preferredSupplierId: data.preferredSupplierId,
    storageLocation: data.storageLocation,
    expiryTracking: data.expiryTracking,
    notes: data.notes,
  };

  const item = itemId
    ? await prisma.inventoryItem.update({ where: { id: itemId }, data: values })
    : await prisma.inventoryItem.create({
        data: {
          ...values,
          // New items start costed at the purchase price per base unit.
          averageCost: new Prisma.Decimal(data.currentPrice)
            .div(new Prisma.Decimal(data.conversionFactor))
            .toDecimalPlaces(4),
        },
      });

  await audit({
    userId: user.id,
    action: itemId ? "inventory.item_update" : "inventory.item_create",
    entityType: "InventoryItem",
    entityId: item.id,
    metadata: { sku: item.sku },
  });

  revalidatePath("/inventory");
  redirect(`/inventory/${item.id}`);
}

export async function setItemActive(itemId: string, isActive: boolean): Promise<FormState> {
  const user = await actionPermission("inventory.manageItems");
  await prisma.inventoryItem.update({ where: { id: itemId }, data: { isActive } });
  await audit({
    userId: user.id,
    action: isActive ? "inventory.item_activate" : "inventory.item_deactivate",
    entityType: "InventoryItem",
    entityId: itemId,
  });
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  return { success: true };
}

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await actionPermission("inventory.manageItems");

  const parsed = categoryFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);

  const category = await prisma.inventoryCategory.create({ data: parsed.data });
  await audit({
    userId: user.id,
    action: "inventory.category_create",
    entityType: "InventoryCategory",
    entityId: category.id,
    metadata: { nameAr: category.nameAr },
  });

  revalidatePath("/inventory/categories");
  return { success: true };
}
