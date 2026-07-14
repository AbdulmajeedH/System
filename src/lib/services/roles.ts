import { Role } from "../../generated/prisma/enums";

/** Role seniority for "an equal-or-higher role may approve" checks. */
export const ROLE_RANK: Record<Role, number> = {
  EMPLOYEE: 0,
  DEPARTMENT_MANAGER: 1,
  PURCHASING_OFFICER: 1,
  WAREHOUSE_MANAGER: 1,
  GENERAL_MANAGER: 2,
  OWNER: 3,
};

export function roleSatisfies(actual: Role, required: Role): boolean {
  if (actual === required) return true;
  return ROLE_RANK[actual] > ROLE_RANK[required];
}
