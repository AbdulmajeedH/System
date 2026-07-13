"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser, requestMeta } from "@/lib/auth/session";
import { audit } from "@/lib/services/audit";
import { t } from "@/lib/i18n/ar";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_FAILURES = 5;

/**
 * DB-backed rate limit (works across serverless instances): block login
 * attempts for an email or IP with too many recent failures, recorded in
 * the audit log.
 */
async function isLoginBlocked(email: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);
  const failures = await prisma.auditLog.count({
    where: {
      action: "auth.login_failed",
      createdAt: { gte: since },
      OR: [
        { metadata: { path: ["email"], equals: email } },
        ...(ip ? [{ ip }] : []),
      ],
    },
  });
  return failures >= LOGIN_MAX_FAILURES;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: t.auth.invalidCredentials };
  }

  const { ip } = await requestMeta();
  if (await isLoginBlocked(parsed.data.email, ip)) {
    await audit({ action: "auth.login_blocked", metadata: { email: parsed.data.email } });
    return { error: t.auth.tooManyAttempts };
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
