import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type PrismaClient } from "../../src/generated/prisma/client";
import {
  AttachmentEntityType,
  LocationType,
  Role,
  ShiftType,
} from "../../src/generated/prisma/enums";
import { canViewAttachment } from "../../src/lib/services/attachment-access";
import type { SessionUser } from "../../src/lib/auth/session";
import { createTestClient } from "../helpers/db";

const D = (v: string | number) => new Prisma.Decimal(v);

let prisma: PrismaClient;
const suffix = `att-${Date.now().toString(36)}`;

// Session-user stubs (attachment access depends on role + departmentId).
let deptA: string;
let deptB: string;
let incomeId: string;
let transferId: string;
let attendanceEventId: string;
let uploaderId: string;

function sessionUser(id: string, role: Role, departmentId: string | null): SessionUser {
  return { id, email: `${id}@t.local`, name: id, role, departmentId, departmentName: null };
}

beforeAll(async () => {
  prisma = createTestClient();

  const a = await prisma.department.create({
    data: { code: `A-${suffix}`, nameAr: "قسم أ" },
  });
  const b = await prisma.department.create({
    data: { code: `B-${suffix}`, nameAr: "قسم ب" },
  });
  deptA = a.id;
  deptB = b.id;

  const uploader = await prisma.user.create({
    data: {
      email: `up-${suffix}@t.local`,
      passwordHash: "x",
      name: "Uploader",
      role: Role.DEPARTMENT_MANAGER,
      departmentId: deptA,
    },
  });
  uploaderId = uploader.id;

  const income = await prisma.dailyIncomeSubmission.create({
    data: {
      departmentId: deptA,
      date: new Date("2026-07-01T00:00:00.000Z"),
      shiftType: ShiftType.FULL_DAY,
      submittedById: uploader.id,
    },
  });
  incomeId = income.id;

  const warehouse = await prisma.inventoryLocation.create({
    data: { code: `WH-${suffix}`, nameAr: "مستودع", type: LocationType.WAREHOUSE },
  });
  const locA = await prisma.inventoryLocation.create({
    data: {
      code: `LA-${suffix}`,
      nameAr: "موقع أ",
      type: LocationType.DEPARTMENT,
      departmentId: deptA,
    },
  });
  const transfer = await prisma.stockTransfer.create({
    data: { fromLocationId: warehouse.id, toLocationId: locA.id },
  });
  transferId = transfer.id;

  const event = await prisma.attendanceEvent.create({
    data: { userId: uploader.id, type: "CHECK_IN", departmentId: deptA },
  });
  attendanceEventId = event.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("attachment authorization by entity", () => {
  it("income attachment: same-department manager yes, other department no, employee no", async () => {
    const ref = {
      entityType: AttachmentEntityType.DAILY_INCOME,
      entityId: incomeId,
      uploadedById: uploaderId,
    };
    expect(
      await canViewAttachment(prisma, sessionUser("mgrA", Role.DEPARTMENT_MANAGER, deptA), ref),
    ).toBe(true);
    expect(
      await canViewAttachment(prisma, sessionUser("mgrB", Role.DEPARTMENT_MANAGER, deptB), ref),
    ).toBe(false);
    expect(await canViewAttachment(prisma, sessionUser("emp", Role.EMPLOYEE, deptA), ref)).toBe(
      false,
    );
    expect(await canViewAttachment(prisma, sessionUser("own", Role.OWNER, null), ref)).toBe(true);
  });

  it("uploader keeps access to their own upload", async () => {
    const ref = {
      entityType: AttachmentEntityType.DAILY_INCOME,
      entityId: incomeId,
      uploadedById: uploaderId,
    };
    expect(
      await canViewAttachment(prisma, sessionUser(uploaderId, Role.EMPLOYEE, deptA), ref),
    ).toBe(true);
  });

  it("invoice attachment: purchasing and warehouse yes, department manager no", async () => {
    const ref = {
      entityType: AttachmentEntityType.PURCHASE_INVOICE,
      entityId: "whatever",
      uploadedById: "someone-else",
    };
    expect(
      await canViewAttachment(prisma, sessionUser("po", Role.PURCHASING_OFFICER, null), ref),
    ).toBe(true);
    expect(
      await canViewAttachment(prisma, sessionUser("wh", Role.WAREHOUSE_MANAGER, null), ref),
    ).toBe(true);
    expect(
      await canViewAttachment(prisma, sessionUser("mgr", Role.DEPARTMENT_MANAGER, deptA), ref),
    ).toBe(false);
  });

  it("transfer attachment: warehouse and involved department yes, other department no", async () => {
    const ref = {
      entityType: AttachmentEntityType.STOCK_TRANSFER,
      entityId: transferId,
      uploadedById: "someone-else",
    };
    expect(
      await canViewAttachment(prisma, sessionUser("wh", Role.WAREHOUSE_MANAGER, null), ref),
    ).toBe(true);
    expect(
      await canViewAttachment(prisma, sessionUser("mgrA", Role.DEPARTMENT_MANAGER, deptA), ref),
    ).toBe(true);
    expect(
      await canViewAttachment(prisma, sessionUser("mgrB", Role.DEPARTMENT_MANAGER, deptB), ref),
    ).toBe(false);
  });

  it("attendance attachment: owner of the event and department manager yes, peers no", async () => {
    const ref = {
      entityType: AttachmentEntityType.ATTENDANCE_EVENT,
      entityId: attendanceEventId,
      uploadedById: "someone-else",
    };
    expect(
      await canViewAttachment(prisma, sessionUser(uploaderId, Role.EMPLOYEE, deptA), ref),
    ).toBe(true);
    expect(
      await canViewAttachment(prisma, sessionUser("mgrA", Role.DEPARTMENT_MANAGER, deptA), ref),
    ).toBe(true);
    expect(await canViewAttachment(prisma, sessionUser("emp2", Role.EMPLOYEE, deptA), ref)).toBe(
      false,
    );
    expect(
      await canViewAttachment(prisma, sessionUser("mgrB", Role.DEPARTMENT_MANAGER, deptB), ref),
    ).toBe(false);
  });

  it("nonexistent related record denies access", async () => {
    expect(
      await canViewAttachment(prisma, sessionUser("mgrA", Role.DEPARTMENT_MANAGER, deptA), {
        entityType: AttachmentEntityType.DAILY_INCOME,
        entityId: "missing",
        uploadedById: "someone-else",
      }),
    ).toBe(false);
  });
});
