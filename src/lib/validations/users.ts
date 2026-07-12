import { z } from "zod";
import { Role } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";

const roleValues = Object.values(Role) as [Role, ...Role[]];

/** Roles that operate inside a specific department and therefore require one. */
export const DEPARTMENT_SCOPED_ROLES: Role[] = [Role.DEPARTMENT_MANAGER, Role.EMPLOYEE];

const baseUser = z.object({
  name: z.string().trim().min(2, t.common.required),
  email: z.string().trim().toLowerCase().email(t.common.required),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null)),
  role: z.enum(roleValues),
  departmentId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
});

function requireDepartmentForScopedRoles(data: { role: Role; departmentId: string | null }) {
  return !DEPARTMENT_SCOPED_ROLES.includes(data.role) || data.departmentId !== null;
}

export const createUserSchema = baseUser
  .extend({ password: z.string().min(8, t.users.passwordHint) })
  .refine(requireDepartmentForScopedRoles, {
    message: t.users.departmentRequired,
    path: ["departmentId"],
  });

export const updateUserSchema = baseUser.refine(requireDepartmentForScopedRoles, {
  message: t.users.departmentRequired,
  path: ["departmentId"],
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, t.users.passwordHint),
});
