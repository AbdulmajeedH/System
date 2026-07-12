"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/services/audit";
import { t } from "@/lib/i18n/ar";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: t.auth.invalidCredentials };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await audit({ userId: user?.id, action: "auth.login_failed", metadata: { email: parsed.data.email } });
    return { error: t.auth.invalidCredentials };
  }
  if (!user.isActive) {
    return { error: t.auth.accountDisabled };
  }

  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ userId: user.id, action: "auth.login" });

  redirect("/");
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await audit({ userId: user.id, action: "auth.logout" });
  }
  redirect("/login");
}
