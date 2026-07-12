import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type PrismaClient } from "../../src/generated/prisma/client";
import {
  ApprovalDecision,
  ApprovalStatus,
  ApprovalTransactionType,
  Role,
} from "../../src/generated/prisma/enums";
import {
  ApprovalError,
  createApprovalRequest,
  decideApproval,
} from "../../src/lib/services/approvals";
import { createTestClient } from "../helpers/db";

const D = (v: string | number) => new Prisma.Decimal(v);

let prisma: PrismaClient;
let purchasingId: string;
let gmId: string;

beforeAll(async () => {
  prisma = createTestClient();
  const suffix = Date.now();

  const purchasing = await prisma.user.create({
    data: {
      email: `po-${suffix}@test.local`,
      passwordHash: "x",
      name: "PO",
      role: Role.PURCHASING_OFFICER,
    },
  });
  purchasingId = purchasing.id;
  const gm = await prisma.user.create({
    data: {
      email: `gm-${suffix}@test.local`,
      passwordHash: "x",
      name: "GM",
      role: Role.GENERAL_MANAGER,
    },
  });
  gmId = gm.id;

  await prisma.approvalRule.createMany({
    data: [
      { transactionType: ApprovalTransactionType.PURCHASE_INVOICE, maxAmount: D(500), requiredRole: Role.PURCHASING_OFFICER },
      { transactionType: ApprovalTransactionType.PURCHASE_INVOICE, minAmount: D(500), maxAmount: D(2000), requiredRole: Role.GENERAL_MANAGER },
      { transactionType: ApprovalTransactionType.PURCHASE_INVOICE, minAmount: D(2000), requiredRole: Role.OWNER },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("approval workflow", () => {
  it("auto-approves when the requester satisfies the required role", async () => {
    const result = await prisma.$transaction((tx) =>
      createApprovalRequest(tx, {
        transactionType: ApprovalTransactionType.PURCHASE_INVOICE,
        entityType: "PurchaseInvoice",
        entityId: "inv-small",
        amount: D("300"),
        requestedById: purchasingId,
        requesterRole: Role.PURCHASING_OFFICER,
      }),
    );
    expect(result.autoApproved).toBe(true);
  });

  it("creates a pending request routed to the rule's role", async () => {
    const result = await prisma.$transaction((tx) =>
      createApprovalRequest(tx, {
        transactionType: ApprovalTransactionType.PURCHASE_INVOICE,
        entityType: "PurchaseInvoice",
        entityId: "inv-mid",
        amount: D("1500"),
        requestedById: purchasingId,
        requesterRole: Role.PURCHASING_OFFICER,
      }),
    );
    expect(result.autoApproved).toBe(false);
    if (!result.autoApproved) {
      expect(result.requiredRole).toBe(Role.GENERAL_MANAGER);
    }
  });

  it("does not duplicate pending requests for the same entity", async () => {
    const again = await prisma.$transaction((tx) =>
      createApprovalRequest(tx, {
        transactionType: ApprovalTransactionType.PURCHASE_INVOICE,
        entityType: "PurchaseInvoice",
        entityId: "inv-mid",
        amount: D("1500"),
        requestedById: purchasingId,
        requesterRole: Role.PURCHASING_OFFICER,
      }),
    );
    expect(again.autoApproved).toBe(false);
    const count = await prisma.approvalRequest.count({
      where: { entityId: "inv-mid", status: ApprovalStatus.PENDING },
    });
    expect(count).toBe(1);
  });

  it("blocks under-ranked approvers and accepts satisfying ones", async () => {
    // A large invoice requires the owner; the GM must be rejected.
    await prisma.$transaction((tx) =>
      createApprovalRequest(tx, {
        transactionType: ApprovalTransactionType.PURCHASE_INVOICE,
        entityType: "PurchaseInvoice",
        entityId: "inv-big",
        amount: D("5000"),
        requestedById: purchasingId,
        requesterRole: Role.PURCHASING_OFFICER,
      }),
    );
    await expect(
      prisma.$transaction((tx) =>
        decideApproval(tx, {
          entityType: "PurchaseInvoice",
          entityId: "inv-big",
          decision: ApprovalDecision.APPROVED,
          userId: gmId,
          userRole: Role.GENERAL_MANAGER,
        }),
      ),
    ).rejects.toThrow(ApprovalError);

    // The GM can decide the mid-band invoice.
    await prisma.$transaction((tx) =>
      decideApproval(tx, {
        entityType: "PurchaseInvoice",
        entityId: "inv-mid",
        decision: ApprovalDecision.APPROVED,
        comment: "ok",
        userId: gmId,
        userRole: Role.GENERAL_MANAGER,
      }),
    );
    const request = await prisma.approvalRequest.findFirst({
      where: { entityId: "inv-mid" },
      include: { actions: true },
    });
    expect(request?.status).toBe(ApprovalStatus.APPROVED);
    expect(request?.actions).toHaveLength(1);
    expect(request?.actions[0].previousStatus).toBe(ApprovalStatus.PENDING);
  });

  it("rejects deciding an already-decided entity", async () => {
    await expect(
      prisma.$transaction((tx) =>
        decideApproval(tx, {
          entityType: "PurchaseInvoice",
          entityId: "inv-mid",
          decision: ApprovalDecision.REJECTED,
          comment: "again",
          userId: gmId,
          userRole: Role.GENERAL_MANAGER,
        }),
      ),
    ).rejects.toThrow(ApprovalError);
  });
});
