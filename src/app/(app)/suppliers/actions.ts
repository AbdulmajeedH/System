"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { actionPermission } from "@/lib/auth/guards";
import { audit } from "@/lib/services/audit";
import { supplierFormSchema } from "@/lib/validations/inventory";
import { fieldErrorsFromZod, type FormState } from "@/lib/utils/action-state";

export async function saveSupplier(
  supplierId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionPermission("supplier.manage");

  const parsed = supplierFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);

  const supplier = supplierId
    ? await prisma.supplier.update({ where: { id: supplierId }, data: parsed.data })
    : await prisma.supplier.create({ data: parsed.data });

  await audit({
    userId: user.id,
    action: supplierId ? "supplier.update" : "supplier.create",
    entityType: "Supplier",
    entityId: supplier.id,
    metadata: { nameAr: supplier.nameAr },
  });

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function setSupplierActive(supplierId: string, isActive: boolean): Promise<FormState> {
  const user = await actionPermission("supplier.manage");
  await prisma.supplier.update({ where: { id: supplierId }, data: { isActive } });
  await audit({
    userId: user.id,
    action: isActive ? "supplier.activate" : "supplier.deactivate",
    entityType: "Supplier",
    entityId: supplierId,
  });
  revalidatePath("/suppliers");
  return { success: true };
}
