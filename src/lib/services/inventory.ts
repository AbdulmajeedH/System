// Relative imports (not @/ aliases) so prisma/seed.ts can run this through tsx.
import { Prisma } from "../../generated/prisma/client";
import { MovementType } from "../../generated/prisma/enums";

const Decimal = Prisma.Decimal;
export type DecimalValue = Prisma.Decimal;

export class InsufficientStockError extends Error {
  constructor(
    public readonly itemId: string,
    public readonly locationId: string,
    public readonly available: Prisma.Decimal,
    public readonly requested: Prisma.Decimal,
  ) {
    super("الكمية المتوفرة في الموقع غير كافية");
    this.name = "InsufficientStockError";
  }
}

export type MovementInput = {
  itemId: string;
  /** Positive quantity in the item's BASE unit. */
  quantity: Prisma.Decimal | string | number;
  type: MovementType;
  sourceLocationId?: string | null;
  destLocationId?: string | null;
  refType?: string;
  refId?: string;
  userId: string;
  reason?: string | null;
};

/** Which side(s) of the ledger each movement type must touch. */
const MOVEMENT_SHAPE: Record<MovementType, { source: boolean; dest: boolean }> = {
  PURCHASE_RECEIPT: { source: false, dest: true },
  TRANSFER_OUT: { source: true, dest: false },
  TRANSFER_IN: { source: false, dest: true },
  DAMAGE: { source: true, dest: false },
  EXPIRY: { source: true, dest: false },
  RETURN_TO_WAREHOUSE: { source: true, dest: true },
  SUPPLIER_RETURN: { source: true, dest: false },
  COUNT_ADJUSTMENT: { source: false, dest: false }, // either side, validated below
  MANUAL_ADJUSTMENT: { source: false, dest: false },
  OPENING_BALANCE: { source: false, dest: true },
};

async function adjustBalance(
  tx: Prisma.TransactionClient,
  itemId: string,
  locationId: string,
  delta: Prisma.Decimal,
  allowNegative: boolean,
): Promise<{ prev: Prisma.Decimal; next: Prisma.Decimal }> {
  const balance = await tx.inventoryBalance.upsert({
    where: { itemId_locationId: { itemId, locationId } },
    create: { itemId, locationId, quantity: new Decimal(0) },
    update: {},
  });
  const prev = balance.quantity;
  const next = prev.add(delta);
  if (next.isNegative() && !allowNegative) {
    throw new InsufficientStockError(itemId, locationId, prev, delta.abs());
  }
  await tx.inventoryBalance.update({
    where: { id: balance.id },
    data: { quantity: next },
  });
  return { prev, next };
}

/**
 * Posts one movement to the immutable inventory ledger and updates the
 * affected location balances atomically. MUST be called inside a
 * transaction — use `withSerializableTx` for user-facing mutations.
 *
 * This is the ONLY way stock quantities change in this system.
 */
export async function postMovement(
  tx: Prisma.TransactionClient,
  input: MovementInput,
): Promise<{ movementId: string }> {
  const quantity = new Decimal(input.quantity);
  if (quantity.lte(0)) {
    throw new Error(`Movement quantity must be positive (got ${quantity.toString()})`);
  }

  const shape = MOVEMENT_SHAPE[input.type];
  const sourceId = input.sourceLocationId ?? null;
  const destId = input.destLocationId ?? null;

  const isAdjustment =
    input.type === MovementType.COUNT_ADJUSTMENT || input.type === MovementType.MANUAL_ADJUSTMENT;
  if (isAdjustment) {
    // Adjustments touch exactly one side: dest = stock found, source = stock lost.
    if ((sourceId === null) === (destId === null)) {
      throw new Error("Adjustment movements need exactly one of source or destination");
    }
  } else {
    if (shape.source !== (sourceId !== null) || shape.dest !== (destId !== null)) {
      throw new Error(`Movement type ${input.type} has invalid source/destination locations`);
    }
  }

  let prevSourceQty: Prisma.Decimal | null = null;
  let newSourceQty: Prisma.Decimal | null = null;
  let prevDestQty: Prisma.Decimal | null = null;
  let newDestQty: Prisma.Decimal | null = null;

  if (sourceId) {
    const { prev, next } = await adjustBalance(tx, input.itemId, sourceId, quantity.neg(), false);
    prevSourceQty = prev;
    newSourceQty = next;
  }
  if (destId) {
    const { prev, next } = await adjustBalance(tx, input.itemId, destId, quantity, false);
    prevDestQty = prev;
    newDestQty = next;
  }

  const movement = await tx.inventoryMovement.create({
    data: {
      itemId: input.itemId,
      quantity,
      type: input.type,
      sourceLocationId: sourceId,
      destLocationId: destId,
      refType: input.refType,
      refId: input.refId,
      userId: input.userId,
      reason: input.reason ?? null,
      prevSourceQty,
      newSourceQty,
      prevDestQty,
      newDestQty,
    },
  });

  return { movementId: movement.id };
}

/** Converts a quantity in the item's purchase unit to base units. */
export function toBaseQty(
  purchaseQty: Prisma.Decimal | string | number,
  conversionFactor: Prisma.Decimal | string | number,
): Prisma.Decimal {
  return new Decimal(purchaseQty).mul(new Decimal(conversionFactor));
}

/**
 * Moving-average cost update on purchase receipt.
 * newAvg = (currentQty * currentAvg + receivedQty * unitCost) / (currentQty + receivedQty)
 * Quantities/costs are per BASE unit.
 */
export function movingAverageCost(
  currentQty: Prisma.Decimal,
  currentAvg: Prisma.Decimal,
  receivedQty: Prisma.Decimal,
  receivedUnitCost: Prisma.Decimal,
): Prisma.Decimal {
  const totalQty = currentQty.add(receivedQty);
  if (totalQty.lte(0)) return receivedUnitCost;
  const positiveCurrentQty = currentQty.isNegative() ? new Decimal(0) : currentQty;
  const denominator = positiveCurrentQty.add(receivedQty);
  if (denominator.lte(0)) return receivedUnitCost;
  return positiveCurrentQty
    .mul(currentAvg)
    .add(receivedQty.mul(receivedUnitCost))
    .div(denominator)
    .toDecimalPlaces(4);
}
