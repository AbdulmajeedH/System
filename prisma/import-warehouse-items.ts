/**
 * One-off importer: seeds the inventory catalog from the warehouse workbook
 * (last physical count). Creates categories and items ONLY — no stock balances
 * and no ledger movements — so real quantities are set later via an in-app
 * stock count. Prices/units are not in the source sheet, so items are created
 * with the "حبة" (piece) unit and price 0 for a human to refine.
 *
 * Idempotent: an item is skipped if its SKU or Arabic name already exists, so
 * this can be re-run safely (e.g. after adding more rows to the data file).
 *
 * Run locally:   npm run import:warehouse
 * Run on Neon:   set DIRECT_DATABASE_URL (or DATABASE_URL) to the Neon
 *                connection string, then run the same command.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { IMPORT_CATEGORIES, IMPORT_ITEMS } from "./warehouse-import-data";

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL (or DIRECT_DATABASE_URL) must be set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const PIECE_UNIT = { code: "PIECE", nameAr: "حبة" };
const IMPORT_NOTE = "مستورد من جرد المستودع — حدّد الكمية عبر جرد داخل النظام";

async function main() {
  // Ensure the fallback unit exists (matches the seed's PIECE unit).
  const piece = await prisma.unitDef.upsert({
    where: { code: PIECE_UNIT.code },
    create: PIECE_UNIT,
    update: {},
    select: { id: true },
  });

  // Ensure each top-level category exists (idempotent by name).
  const categoryId = new Map<string, string>();
  for (const nameAr of IMPORT_CATEGORIES) {
    const existing = await prisma.inventoryCategory.findFirst({
      where: { nameAr, parentId: null },
      select: { id: true },
    });
    const category =
      existing ?? (await prisma.inventoryCategory.create({ data: { nameAr }, select: { id: true } }));
    categoryId.set(nameAr, category.id);
  }

  let created = 0;
  const skipped: string[] = [];

  for (const item of IMPORT_ITEMS) {
    const clash = await prisma.inventoryItem.findFirst({
      where: { OR: [{ sku: item.sku }, { nameAr: item.nameAr }] },
      select: { id: true },
    });
    if (clash) {
      skipped.push(item.nameAr);
      continue;
    }

    await prisma.inventoryItem.create({
      data: {
        nameAr: item.nameAr,
        sku: item.sku,
        categoryId: categoryId.get(item.category) ?? null,
        baseUnitId: piece.id,
        purchaseUnitId: piece.id,
        conversionFactor: 1,
        currentPrice: 0,
        minStock: 0,
        reorderLevel: 0,
        isActive: true,
        notes: IMPORT_NOTE,
      },
    });
    created += 1;
  }

  console.log(`Categories ensured: ${IMPORT_CATEGORIES.length}`);
  console.log(`Items created:      ${created}`);
  console.log(`Items skipped:      ${skipped.length} (already existed)`);
  if (skipped.length) console.log("  skipped:", skipped.join("، "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
