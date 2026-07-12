"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { actionPermission } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/services/audit";
import { t } from "@/lib/i18n/ar";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "@/lib/validations/users";
import { fieldErrorsFromZod, type FormState } from "@/lib/utils/action-state";

function formValues(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    role: formData.get("role"),
    departmentId: formData.get("departmentId") ?? undefined,
  };
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await actionPermission("users.manage");

  const parsed = createUserSchema.safeParse({
    ...formValues(formData),
    password: formData.get("password"),
  });
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);

  const { password, ...data } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return { fieldErrors: { email: t.users.emailExists } };

  const user = await prisma.user.create({
    data: { ...data, passwordHash: await hashPassword(password) },
  });
  await audit({
    userId: admin.id,
    action: "users.create",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await actionPermission("users.manage");

  const parsed = updateUserSchema.safeParse(formValues(formData));
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { error: t.common.error };

  const emailTaken = await prisma.user.findFirst({
    where: { email: parsed.data.email, id: { not: userId } },
  });
  if (emailTaken) return { fieldErrors: { email: t.users.emailExists } };

  await prisma.user.update({ where: { id: userId }, data: parsed.data });
  await audit({
    userId: admin.id,
    action: "users.update",
    entityType: "User",
    entityId: userId,
    metadata: { role: parsed.data.role, departmentId: parsed.data.departmentId },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function setUserActive(userId: string, isActive: boolean): Promise<FormState> {
  const admin = await actionPermission("users.manage");

  if (userId === admin.id && !isActive) {
    return { error: t.users.cannotDeactivateSelf };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive } });
    if (!isActive) {
      // Kick the user out of any open sessions immediately.
      await tx.session.deleteMany({ where: { userId } });
    }
  });
  await audit({
    userId: admin.id,
    action: isActive ? "users.activate" : "users.deactivate",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/users");
  return { success: true };
}

export async function resetUserPassword(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await actionPermission("users.manage");

  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return fieldErrorsFromZod(parsed.error);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    });
    // Invalidate existing sessions after a password change.
    await tx.session.deleteMany({ where: { userId } });
  });
  await audit({
    userId: admin.id,
    action: "users.reset_password",
    entityType: "User",
    entityId: userId,
  });

  return { success: true };
}
