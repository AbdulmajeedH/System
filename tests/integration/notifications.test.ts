import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type PrismaClient } from "../../src/generated/prisma/client";
import { ApprovalTransactionType, Role } from "../../src/generated/prisma/enums";
import { createApprovalRequest } from "../../src/lib/services/approvals";
import {
  notifyRoles,
  rolesSatisfying,
} from "../../src/lib/services/notifications";
import { createTestClient } from "../helpers/db";

let prisma: PrismaClient;
const suffix = `ntf-${Date.now().toString(36)}`;
let gmId: string;
let ownerId: string;
let requesterId: string;

beforeAll(async () => {
  prisma = createTestClient();
  const gm = await prisma.user.create({
    data: { email: `gm-${suffix}@t.local`, passwordHash: "x", name: "GM", role: Role.GENERAL_MANAGER },
  });
  const owner = await prisma.user.create({
    data: { email: `ow-${suffix}@t.local`, passwordHash: "x", name: "Owner", role: Role.OWNER },
  });
  const requester = await prisma.user.create({
    data: { email: `rq-${suffix}@t.local`, passwordHash: "x", name: "Req", role: Role.PURCHASING_OFFICER },
  });
  gmId = gm.id;
  ownerId = owner.id;
  requesterId = requester.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("notifications", () => {
  it("rolesSatisfying includes the role and its seniors only", () => {
    const roles = rolesSatisfying(Role.GENERAL_MANAGER);
    expect(roles).toContain(Role.GENERAL_MANAGER);
    expect(roles).toContain(Role.OWNER);
    expect(roles).not.toContain(Role.WAREHOUSE_MANAGER);
    expect(roles).not.toContain(Role.EMPLOYEE);
  });

  it("a pending approval request notifies satisfying users but not the requester", async () => {
    await prisma.$transaction((tx) =>
      createApprovalRequest(tx, {
        transactionType: ApprovalTransactionType.EXPENSE,
        entityType: "Expense",
        entityId: `exp-${suffix}`,
        amount: new Prisma.Decimal("100000"), // no rule → defaults to OWNER
        requestedById: requesterId,
        requesterRole: Role.PURCHASING_OFFICER,
      }),
    );
    const ownerNotes = await prisma.notification.findMany({
      where: { userId: ownerId, entityId: `exp-${suffix}` },
    });
    expect(ownerNotes).toHaveLength(1);
    expect(ownerNotes[0].type).toBe("approval.pending");
    const requesterNotes = await prisma.notification.count({
      where: { userId: requesterId, entityId: `exp-${suffix}` },
    });
    expect(requesterNotes).toBe(0);
  });

  it("respects a disabled preference", async () => {
    await prisma.notificationPreference.create({
      data: { userId: gmId, type: "stock.low", enabled: false },
    });
    await notifyRoles(prisma, [Role.GENERAL_MANAGER, Role.OWNER], {
      type: "stock.low",
      title: "منخفض",
      entityType: "InventoryItem",
      entityId: `item-${suffix}`,
    });
    expect(
      await prisma.notification.count({ where: { userId: gmId, entityId: `item-${suffix}` } }),
    ).toBe(0);
    expect(
      await prisma.notification.count({ where: { userId: ownerId, entityId: `item-${suffix}` } }),
    ).toBe(1);
  });
});
