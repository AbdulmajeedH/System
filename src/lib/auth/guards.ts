import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";
import { can, type Permission } from "./permissions";

export class ForbiddenError extends Error {
  constructor(message = "ليس لديك صلاحية للقيام بهذا الإجراء") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** For pages: redirects to login when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: redirects when the permission is missing. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function actionUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("انتهت الجلسة، يرجى تسجيل الدخول من جديد");
  return user;
}

export async function actionPermission(permission: Permission): Promise<SessionUser> {
  const user = await actionUser();
  if (!can(user, permission)) throw new ForbiddenError();
  return user;
}
