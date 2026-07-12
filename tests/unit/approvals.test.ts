import { describe, expect, it } from "vitest";
import { Prisma } from "../../src/generated/prisma/client";
import { Role } from "../../src/generated/prisma/enums";
import { matchRule, roleSatisfies } from "../../src/lib/services/approvals";

const D = (v: string) => new Prisma.Decimal(v);

const rule = (
  min: string | null,
  max: string | null,
  requiredRole: Role,
  departmentId: string | null = null,
) => ({
  minAmount: min ? D(min) : null,
  maxAmount: max ? D(max) : null,
  departmentId,
  requiredRole,
  level: 1,
});

const invoiceRules = [
  rule(null, "500", Role.PURCHASING_OFFICER),
  rule("500", "2000", Role.GENERAL_MANAGER),
  rule("2000", null, Role.OWNER),
];

describe("matchRule", () => {
  it("matches bands as [min, max)", () => {
    expect(matchRule(invoiceRules, D("499.99"))?.requiredRole).toBe(Role.PURCHASING_OFFICER);
    expect(matchRule(invoiceRules, D("500"))?.requiredRole).toBe(Role.GENERAL_MANAGER);
    expect(matchRule(invoiceRules, D("1999.99"))?.requiredRole).toBe(Role.GENERAL_MANAGER);
    expect(matchRule(invoiceRules, D("2000"))?.requiredRole).toBe(Role.OWNER);
    expect(matchRule(invoiceRules, D("999999"))?.requiredRole).toBe(Role.OWNER);
  });

  it("prefers department-specific rules over global ones", () => {
    const rules = [
      rule(null, null, Role.GENERAL_MANAGER),
      rule(null, null, Role.OWNER, "dept-1"),
    ];
    expect(matchRule(rules, D("100"), "dept-1")?.requiredRole).toBe(Role.OWNER);
    expect(matchRule(rules, D("100"), "dept-2")?.requiredRole).toBe(Role.GENERAL_MANAGER);
    expect(matchRule(rules, D("100"))?.requiredRole).toBe(Role.GENERAL_MANAGER);
  });

  it("returns null when nothing matches", () => {
    expect(matchRule([rule("100", "200", Role.OWNER)], D("50"))).toBeNull();
  });
});

describe("roleSatisfies", () => {
  it("owner satisfies everything", () => {
    for (const required of Object.values(Role)) {
      expect(roleSatisfies(Role.OWNER, required)).toBe(true);
    }
  });

  it("general manager satisfies mid-level roles but not owner", () => {
    expect(roleSatisfies(Role.GENERAL_MANAGER, Role.WAREHOUSE_MANAGER)).toBe(true);
    expect(roleSatisfies(Role.GENERAL_MANAGER, Role.GENERAL_MANAGER)).toBe(true);
    expect(roleSatisfies(Role.GENERAL_MANAGER, Role.OWNER)).toBe(false);
  });

  it("peers do not satisfy each other", () => {
    expect(roleSatisfies(Role.WAREHOUSE_MANAGER, Role.PURCHASING_OFFICER)).toBe(false);
    expect(roleSatisfies(Role.PURCHASING_OFFICER, Role.WAREHOUSE_MANAGER)).toBe(false);
  });
});
