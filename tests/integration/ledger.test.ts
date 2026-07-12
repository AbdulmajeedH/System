import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type PrismaClient } from "../../src/generated/prisma/client";
import { LocationType, MovementType, Role } from "../../src/generated/prisma/enums";
import {
  InsufficientStockError,
  postMovement,
} from "../../src/lib/services/inventory";
import { createTestClient } from "../helpers/db";

const D = (v: string | number) => new Prisma.Decimal(v);

let prisma: PrismaClient;
let userId: string;
let warehouseId: string;
let restaurantLocId: string;
let itemId: string;

beforeAll(async () => {
  prisma = createTestClient();

  const user = await prisma.user.create({
    data: {
      email: `ledger-${Date.now()}@test.local`,
      passwordHash: "x",
      name: "Test User",
      role: Role.WAREHOUSE_MANAGER,
    },
  });
  userId = user.id;

  const suffix = Date.now().toString(36);
  const warehouse = await prisma.inventoryLocation.create({
    data: { code: `WH-${suffix}`, nameAr: "مستودع اختبار", type: LocationType.WAREHOUSE },
  });
  warehouseId = warehouse.id;
  const restaurant = await prisma.inventoryLocation.create({
    data: { code: `REST-${suffix}`, nameAr: "مطعم اختبار", type: LocationType.DEPARTMENT },
  });
  restaurantLocId = restaurant.id;

  const unit = await prisma.unitDef.create({ data: { code: `KG-${suffix}`, nameAr: "كجم" } });
  const item = await prisma.inventoryItem.create({
    data: {
      nameAr: "صنف اختبار",
      sku: `TEST-${suffix}`,
      baseUnitId: unit.id,
      purchaseUnitId: unit.id,
      conversionFactor: D(1),
      averageCost: D("10"),
    },
  });
  itemId = item.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function balance(locationId: string): Promise<string> {
  const row = await prisma.inventoryBalance.findUnique({
    where: { itemId_locationId: { itemId, locationId } },
  });
  return row?.quantity.toString() ?? "0";
}

describe("inventory ledger", () => {
  it("posts an opening balance", async () => {
    await prisma.$transaction((tx) =>
      postMovement(tx, {
        itemId,
        quantity: "100",
        type: MovementType.OPENING_BALANCE,
        destLocationId: warehouseId,
        userId,
      }),
    );
    expect(await balance(warehouseId)).toBe("100");
  });

  it("records purchase receipts with previous/new quantities", async () => {
    await prisma.$transaction((tx) =>
      postMovement(tx, {
        itemId,
        quantity: "50",
        type: MovementType.PURCHASE_RECEIPT,
        destLocationId: warehouseId,
        userId,
      }),
    );
    expect(await balance(warehouseId)).toBe("150");

    const movement = await prisma.inventoryMovement.findFirst({
      where: { itemId, type: MovementType.PURCHASE_RECEIPT },
    });
    expect(movement?.prevDestQty?.toString()).toBe("100");
    expect(movement?.newDestQty?.toString()).toBe("150");
  });

  it("moves stock between locations via transfer out/in", async () => {
    await prisma.$transaction(async (tx) => {
      await postMovement(tx, {
        itemId,
        quantity: "30",
        type: MovementType.TRANSFER_OUT,
        sourceLocationId: warehouseId,
        userId,
      });
      await postMovement(tx, {
        itemId,
        quantity: "30",
        type: MovementType.TRANSFER_IN,
        destLocationId: restaurantLocId,
        userId,
      });
    });
    expect(await balance(warehouseId)).toBe("120");
    expect(await balance(restaurantLocId)).toBe("30");
  });

  it("rejects movements that would drive a balance negative", async () => {
    await expect(
      prisma.$transaction((tx) =>
        postMovement(tx, {
          itemId,
          quantity: "1000",
          type: MovementType.DAMAGE,
          sourceLocationId: restaurantLocId,
          userId,
        }),
      ),
    ).rejects.toThrow(InsufficientStockError);
    // Balance unchanged after the failed transaction.
    expect(await balance(restaurantLocId)).toBe("30");
  });

  it("rejects non-positive quantities and malformed locations", async () => {
    await expect(
      prisma.$transaction((tx) =>
        postMovement(tx, {
          itemId,
          quantity: "0",
          type: MovementType.DAMAGE,
          sourceLocationId: restaurantLocId,
          userId,
        }),
      ),
    ).rejects.toThrow();
    await expect(
      prisma.$transaction((tx) =>
        postMovement(tx, {
          itemId,
          quantity: "5",
          type: MovementType.PURCHASE_RECEIPT,
          sourceLocationId: warehouseId, // wrong side for a receipt
          userId,
        }),
      ),
    ).rejects.toThrow();
  });

  it("posts count adjustments on the correct side", async () => {
    // Shortage of 5 at the warehouse (counted 115, system 120).
    await prisma.$transaction((tx) =>
      postMovement(tx, {
        itemId,
        quantity: "5",
        type: MovementType.COUNT_ADJUSTMENT,
        sourceLocationId: warehouseId,
        userId,
      }),
    );
    expect(await balance(warehouseId)).toBe("115");
  });

  it("keeps every balance equal to the sum of its movements (invariant)", async () => {
    const movements = await prisma.inventoryMovement.findMany({ where: { itemId } });
    const expected = new Map<string, Prisma.Decimal>();
    for (const m of movements) {
      if (m.sourceLocationId) {
        expected.set(
          m.sourceLocationId,
          (expected.get(m.sourceLocationId) ?? D(0)).sub(m.quantity),
        );
      }
      if (m.destLocationId) {
        expected.set(m.destLocationId, (expected.get(m.destLocationId) ?? D(0)).add(m.quantity));
      }
    }
    for (const [locationId, expectedQty] of expected) {
      expect(await balance(locationId)).toBe(expectedQty.toString());
    }
  });
});
