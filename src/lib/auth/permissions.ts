import type { Role } from "@/generated/prisma/enums";
import type { SessionUser } from "./session";

export type Permission =
  // dashboard & reports
  | "dashboard.view"
  | "reports.view"
  // daily income
  | "income.submit"
  | "income.review"
  | "income.viewAll"
  // expenses
  | "expense.submit"
  | "expense.review"
  // purchasing
  | "invoice.manage"
  | "invoice.approve"
  | "supplier.manage"
  // warehouse
  | "warehouse.manage"
  // stock requests / transfers (department side)
  | "stock.request"
  | "stock.confirmReceipt"
  // inventory
  | "inventory.view"
  | "inventory.viewAll"
  | "inventory.manageItems"
  // stock counts
  | "count.perform"
  | "count.approve"
  // damage
  | "damage.record"
  | "damage.approve"
  // attendance
  | "attendance.own"
  | "attendance.viewDept"
  | "attendance.viewAll"
  // administration
  | "approvals.act"
  | "users.manage"
  | "audit.view"
  | "settings.manage";

const ALL: Permission[] = [
  "dashboard.view", "reports.view",
  "income.submit", "income.review", "income.viewAll",
  "expense.submit", "expense.review",
  "invoice.manage", "invoice.approve", "supplier.manage",
  "warehouse.manage",
  "stock.request", "stock.confirmReceipt",
  "inventory.view", "inventory.viewAll", "inventory.manageItems",
  "count.perform", "count.approve",
  "damage.record", "damage.approve",
  "attendance.own", "attendance.viewDept", "attendance.viewAll",
  "approvals.act", "users.manage", "audit.view", "settings.manage",
];

const rolePermissions: Record<Role, Permission[]> = {
  OWNER: ALL,
  GENERAL_MANAGER: [
    "dashboard.view", "reports.view",
    "income.review", "income.viewAll",
    "expense.review",
    "invoice.approve",
    "inventory.view", "inventory.viewAll",
    "count.approve",
    "damage.approve",
    "attendance.own", "attendance.viewAll",
    "approvals.act",
  ],
  DEPARTMENT_MANAGER: [
    "dashboard.view",
    "income.submit",
    "expense.submit",
    "stock.request", "stock.confirmReceipt",
    "inventory.view",
    "count.perform",
    "damage.record",
    "attendance.own", "attendance.viewDept",
  ],
  PURCHASING_OFFICER: [
    "dashboard.view",
    "invoice.manage", "supplier.manage",
    "inventory.view", "inventory.viewAll",
    "attendance.own",
  ],
  WAREHOUSE_MANAGER: [
    "dashboard.view",
    "warehouse.manage",
    "inventory.view", "inventory.viewAll", "inventory.manageItems",
    "count.perform",
    "damage.record",
    "attendance.own",
    "approvals.act",
  ],
  EMPLOYEE: ["attendance.own"],
};

export function can(user: SessionUser, permission: Permission): boolean {
  return rolePermissions[user.role].includes(permission);
}

/**
 * Financial/inventory data scoping: owner and general manager see every
 * department; everyone else only their own.
 */
export function canAccessDepartment(user: SessionUser, departmentId: string): boolean {
  if (user.role === "OWNER" || user.role === "GENERAL_MANAGER") return true;
  return user.departmentId === departmentId;
}

/**
 * Departments visible to the user for filters/lists. `null` means all.
 */
export function departmentScope(user: SessionUser): string | null {
  if (user.role === "OWNER" || user.role === "GENERAL_MANAGER") return null;
  return user.departmentId;
}

/** Landing page after login: employees go straight to attendance. */
export function homeFor(user: SessionUser): string {
  return can(user, "dashboard.view") ? "/dashboard" : "/attendance";
}
