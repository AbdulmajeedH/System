"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getEmailProvider } from "@/lib/services/email";
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

const RESET_TOKEN_HOURS = 1;

function baseUrl(headerHost: string | null, headerProto: string | null): string {
  // Prefer an explicit APP_URL; fall back to the forwarded host.
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return `${headerProto ?? "https"}://${headerHost ?? "localhost:3000"}`;
}

export type ForgotState = { done?: boolean };

/** No user enumeration: the response is identical whether or not the email exists. */
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) return { done: true };
  const email = parsed.data;

  const { ip } = await requestMeta();
  if (await isLoginBlocked(email, ip)) return { done: true };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000),
      },
    });

    const h = await headers();
    const link = `${baseUrl(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"))}/reset-password?token=${token}`;
    await getEmailProvider().send(email, t.auth.resetTitle, link);
    await audit({ userId: user.id, action: "auth.reset_requested" });
  } else {
    await audit({ action: "auth.reset_requested_unknown", metadata: { email } });
  }

  return { done: true };
}

export type ResetState = { error?: string; done?: boolean };

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token) || password.length < 8) {
    return { error: t.auth.resetInvalid };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      passwordResetExpires: { gt: new Date() },
      isActive: true,
    },
  });
  if (!user) return { error: t.auth.resetInvalid };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        // Single-use: the token is cleared on success.
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
  await audit({ userId: user.id, action: "auth.reset_completed" });

  return { done: true };
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await audit({ userId: user.id, action: "auth.logout" });
  }
  redirect("/login");
}
