/**
 * Seed data for local development and first deployment.
 *
 * Default password for ALL seeded users: "Passw0rd!"
 * (change immediately in any real deployment)
 *
 * Accounts:
 *   owner@rbms.local        المالك            OWNER
 *   gm@rbms.local           مدير العمليات      GENERAL_MANAGER
 *   restaurant@rbms.local   مدير المطعم        DEPARTMENT_MANAGER (مطعم)
 *   cafe@rbms.local         مدير المقهى        DEPARTMENT_MANAGER (مقهى)
 *   minimarket@rbms.local   مدير الميني ماركت  DEPARTMENT_MANAGER (ميني ماركت)
 *   purchasing@rbms.local   مسؤول المشتريات    PURCHASING_OFFICER
 *   warehouse@rbms.local    مدير المستودع      WAREHOUSE_MANAGER
 *   employee@rbms.local     موظف المطعم        EMPLOYEE (مطعم)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import {
  ApprovalTransactionType,
  LocationType,
  MovementType,
  Role,
} from "../src/generated/prisma/enums";
import { postMovement } from "../src/lib/services/inventory";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEFAULT_PASSWORD = "Passw0rd!";

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // --- Departments -----------------------------------------------------
  const departmentDefs = [
    { code: "RESTAURANT", nameAr: "المطعم", nameEn: "Restaurant" },
    { code: "CAFE", nameAr: "المقهى", nameEn: "Café" },
    { code: "MINIMARKET", nameAr: "الميني ماركت", nameEn: "Mini-market" },
  ];
  const departments: Record<string, { id: string }> = {};
  for (const d of departmentDefs) {
    departments[d.code] = await prisma.department.upsert({
      where: { code: d.code },
      create: d,
      update: { nameAr: d.nameAr, nameEn: d.nameEn },
    });
  }

  // --- Inventory locations ---------------------------------------------
  const warehouse = await prisma.inventoryLocation.upsert({
    where: { code: "MAIN_WAREHOUSE" },
    create: { code: "MAIN_WAREHOUSE", nameAr: "المستودع الرئيسي", type: LocationType.WAREHOUSE },
    update: {},
  });
  for (const d of departmentDefs) {
    await prisma.inventoryLocation.upsert({
      where: { code: d.code },
      create: {
        code: d.code,
        nameAr: `مخزون ${d.nameAr}`,
        type: LocationType.DEPARTMENT,
        departmentId: departments[d.code].id,
      },
      update: {},
    });
  }

  // --- Users -------------------------------------------------------------
  const userDefs: Array<{
    email: string;
    name: string;
    role: Role;
    departmentCode?: string;
  }> = [
    { email: "owner@rbms.local", name: "المالك", role: Role.OWNER },
    { email: "gm@rbms.local", name: "مدير العمليات", role: Role.GENERAL_MANAGER },
    { email: "restaurant@rbms.local", name: "مدير المطعم", role: Role.DEPARTMENT_MANAGER, departmentCode: "RESTAURANT" },
    { email: "cafe@rbms.local", name: "مدير المقهى", role: Role.DEPARTMENT_MANAGER, departmentCode: "CAFE" },
    { email: "minimarket@rbms.local", name: "مدير الميني ماركت", role: Role.DEPARTMENT_MANAGER, departmentCode: "MINIMARKET" },
    { email: "purchasing@rbms.local", name: "مسؤول المشتريات", role: Role.PURCHASING_OFFICER },
    { email: "warehouse@rbms.local", name: "مدير المستودع", role: Role.WAREHOUSE_MANAGER },
    { email: "employee@rbms.local", name: "موظف المطعم", role: Role.EMPLOYEE, departmentCode: "RESTAURANT" },
  ];
  const users: Record<string, { id: string }> = {};
  for (const u of userDefs) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        departmentId: u.departmentCode ? departments[u.departmentCode].id : null,
      },
      update: { name: u.name, role: u.role },
    });
  }
  const ownerId = users["owner@rbms.local"].id;

  // --- Units + conversions ------------------------------------------------
  const unitDefs = [
    { code: "PIECE", nameAr: "حبة" },
    { code: "BOX", nameAr: "علبة" },
    { code: "CARTON", nameAr: "كرتون" },
    { code: "KG", nameAr: "كيلوغرام" },
    { code: "G", nameAr: "غرام" },
    { code: "L", nameAr: "لتر" },
    { code: "ML", nameAr: "مل" },
    { code: "PACK", nameAr: "ربطة" },
    { code: "BAG", nameAr: "كيس" },
    { code: "BOTTLE", nameAr: "قارورة" },
    { code: "CAN", nameAr: "عبوة" },
  ];
  const units: Record<string, { id: string }> = {};
  for (const u of unitDefs) {
    units[u.code] = await prisma.unitDef.upsert({
      where: { code: u.code },
      create: u,
      update: { nameAr: u.nameAr },
    });
  }
  const conversions: Array<[string, string, string]> = [
    ["CARTON", "PIECE", "24"],
    ["BOX", "PIECE", "12"],
    ["KG", "G", "1000"],
    ["L", "ML", "1000"],
  ];
  for (const [from, to, factor] of conversions) {
    await prisma.unitConversion.upsert({
      where: { fromUnitId_toUnitId: { fromUnitId: units[from].id, toUnitId: units[to].id } },
      create: { fromUnitId: units[from].id, toUnitId: units[to].id, factor: new Prisma.Decimal(factor) },
      update: { factor: new Prisma.Decimal(factor) },
    });
  }

  // --- Expense categories ---------------------------------------------------
  const expenseCategories = [
    "صيانة",
    "نقل ومواصلات",
    "مشتريات طارئة",
    "نظافة",
    "تغليف",
    "وجبات موظفين",
    "فواتير خدمات",
    "معدات",
    "أخرى",
  ];
  for (const nameAr of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { nameAr },
      create: { nameAr },
      update: {},
    });
  }

  // --- Inventory categories -------------------------------------------------
  const categoryTree: Record<string, string[]> = {
    "مواد غذائية": ["لحوم ودواجن", "خضروات وفواكه", "مواد جافة", "ألبان وأجبان"],
    "مشروبات": ["قهوة وشاي", "مشروبات غازية وعصائر"],
    "مواد تغليف": [],
    "مواد تنظيف": [],
  };
  const categories: Record<string, { id: string }> = {};
  for (const [parentName, children] of Object.entries(categoryTree)) {
    let parent = await prisma.inventoryCategory.findFirst({
      where: { nameAr: parentName, parentId: null },
    });
    if (!parent) {
      parent = await prisma.inventoryCategory.create({ data: { nameAr: parentName } });
    }
    categories[parentName] = parent;
    for (const childName of children) {
      let child = await prisma.inventoryCategory.findFirst({
        where: { nameAr: childName, parentId: parent.id },
      });
      if (!child) {
        child = await prisma.inventoryCategory.create({
          data: { nameAr: childName, parentId: parent.id },
        });
      }
      categories[childName] = child;
    }
  }

  // --- Suppliers ---------------------------------------------------------
  const supplierDefs = [
    {
      nameAr: "مؤسسة الغذاء الطازج",
      contactPerson: "أبو خالد",
      phone: "0501111111",
      categories: "لحوم، دواجن، خضروات",
      paymentTerms: "نقدي",
    },
    {
      nameAr: "شركة المشروبات المتحدة",
      contactPerson: "أبو فهد",
      phone: "0502222222",
      categories: "مشروبات، عصائر، مياه",
      paymentTerms: "آجل ٣٠ يوم",
    },
    {
      nameAr: "مستودع التموين الشامل",
      contactPerson: "أبو محمد",
      phone: "0503333333",
      categories: "مواد جافة، تغليف، تنظيف",
      paymentTerms: "آجل ١٤ يوم",
    },
  ];
  const suppliers: Record<string, { id: string }> = {};
  for (const s of supplierDefs) {
    let supplier = await prisma.supplier.findFirst({ where: { nameAr: s.nameAr } });
    if (!supplier) supplier = await prisma.supplier.create({ data: s });
    suppliers[s.nameAr] = supplier;
  }

  // --- Inventory items (prices per purchase unit, averageCost per base unit) --
  const itemDefs = [
    { sku: "MEAT-001", nameAr: "دجاج طازج", category: "لحوم ودواجن", baseUnit: "KG", purchaseUnit: "KG", factor: "1", price: "18.00", minStock: "20", reorder: "30", supplier: "مؤسسة الغذاء الطازج", opening: "50" },
    { sku: "MEAT-002", nameAr: "لحم بقري مفروم", category: "لحوم ودواجن", baseUnit: "KG", purchaseUnit: "KG", factor: "1", price: "38.00", minStock: "10", reorder: "15", supplier: "مؤسسة الغذاء الطازج", opening: "25" },
    { sku: "VEG-001", nameAr: "طماطم", category: "خضروات وفواكه", baseUnit: "KG", purchaseUnit: "BAG", factor: "10", price: "25.00", minStock: "15", reorder: "25", supplier: "مؤسسة الغذاء الطازج", opening: "40" },
    { sku: "DRY-001", nameAr: "أرز بسمتي", category: "مواد جافة", baseUnit: "KG", purchaseUnit: "BAG", factor: "10", price: "85.00", minStock: "30", reorder: "50", supplier: "مستودع التموين الشامل", opening: "100" },
    { sku: "DRY-002", nameAr: "خبز تورتيلا", category: "مواد جافة", baseUnit: "PIECE", purchaseUnit: "PACK", factor: "20", price: "12.00", minStock: "100", reorder: "200", supplier: "مستودع التموين الشامل", opening: "400" },
    { sku: "DAIRY-001", nameAr: "حليب طازج ١ لتر", category: "ألبان وأجبان", baseUnit: "PIECE", purchaseUnit: "CARTON", factor: "12", price: "54.00", minStock: "48", reorder: "72", supplier: "شركة المشروبات المتحدة", opening: "120" },
    { sku: "BEV-001", nameAr: "حبوب قهوة إسبريسو ١ كجم", category: "قهوة وشاي", baseUnit: "PIECE", purchaseUnit: "PIECE", factor: "1", price: "95.00", minStock: "5", reorder: "10", supplier: "شركة المشروبات المتحدة", opening: "15" },
    { sku: "BEV-002", nameAr: "مشروب غازي ٣٣٠ مل", category: "مشروبات غازية وعصائر", baseUnit: "CAN", purchaseUnit: "CARTON", factor: "24", price: "36.00", minStock: "96", reorder: "144", supplier: "شركة المشروبات المتحدة", opening: "240" },
    { sku: "PKG-001", nameAr: "علب تغليف وجبات", category: "مواد تغليف", baseUnit: "PIECE", purchaseUnit: "CARTON", factor: "200", price: "60.00", minStock: "300", reorder: "500", supplier: "مستودع التموين الشامل", opening: "1000" },
    { sku: "CLN-001", nameAr: "منظف أرضيات ٤ لتر", category: "مواد تنظيف", baseUnit: "BOTTLE", purchaseUnit: "BOX", factor: "4", price: "48.00", minStock: "8", reorder: "12", supplier: "مستودع التموين الشامل", opening: "16" },
  ];

  for (const def of itemDefs) {
    const conversionFactor = new Prisma.Decimal(def.factor);
    const pricePerPurchaseUnit = new Prisma.Decimal(def.price);
    const costPerBaseUnit = pricePerPurchaseUnit.div(conversionFactor).toDecimalPlaces(4);

    const item = await prisma.inventoryItem.upsert({
      where: { sku: def.sku },
      create: {
        sku: def.sku,
        nameAr: def.nameAr,
        categoryId: categories[def.category].id,
        baseUnitId: units[def.baseUnit].id,
        purchaseUnitId: units[def.purchaseUnit].id,
        conversionFactor,
        currentPrice: pricePerPurchaseUnit,
        averageCost: costPerBaseUnit,
        minStock: new Prisma.Decimal(def.minStock),
        reorderLevel: new Prisma.Decimal(def.reorder),
        preferredSupplierId: suppliers[def.supplier].id,
      },
      update: {},
    });

    // Opening balance in the main warehouse — through the ledger, like every
    // other stock change in the system.
    const existingOpening = await prisma.inventoryMovement.findFirst({
      where: { itemId: item.id, type: MovementType.OPENING_BALANCE },
    });
    if (!existingOpening) {
      await prisma.$transaction((tx) =>
        postMovement(tx, {
          itemId: item.id,
          quantity: def.opening,
          type: MovementType.OPENING_BALANCE,
          destLocationId: warehouse.id,
          userId: ownerId,
          reason: "رصيد افتتاحي",
        }),
      );
    }
  }

  // --- Important products (manual end-of-day counts, analysis only) --------
  const importantProducts: Record<string, string[]> = {
    RESTAURANT: ["سندويشات تورتيلا", "برجر", "وجبات دجاج", "سندويشات مسحب"],
    CAFE: ["لاتيه", "سبانش لاتيه", "أمريكانو", "شاي", "حلويات"],
    MINIMARKET: ["سندويشات", "مشروبات مختارة", "أصناف عالية القيمة", "أصناف سريعة الحركة"],
  };
  for (const [deptCode, names] of Object.entries(importantProducts)) {
    for (const [index, nameAr] of names.entries()) {
      const exists = await prisma.importantProduct.findFirst({
        where: { departmentId: departments[deptCode].id, nameAr },
      });
      if (!exists) {
        await prisma.importantProduct.create({
          data: { departmentId: departments[deptCode].id, nameAr, sortOrder: index },
        });
      }
    }
  }

  // --- Approval rules (amounts in SAR) --------------------------------------
  // level semantics: the single role whose approval finalizes this band.
  const approvalRules: Array<{
    type: ApprovalTransactionType;
    min: string | null;
    max: string | null;
    role: Role;
  }> = [
    // Invoices: <500 self-confirm (purchasing), 500–2000 GM, >2000 owner
    { type: ApprovalTransactionType.PURCHASE_INVOICE, min: null, max: "500", role: Role.PURCHASING_OFFICER },
    { type: ApprovalTransactionType.PURCHASE_INVOICE, min: "500", max: "2000", role: Role.GENERAL_MANAGER },
    { type: ApprovalTransactionType.PURCHASE_INVOICE, min: "2000", max: null, role: Role.OWNER },
    // Stock count adjustments: <50 warehouse, 50–500 GM, >500 owner
    { type: ApprovalTransactionType.STOCK_ADJUSTMENT, min: null, max: "50", role: Role.WAREHOUSE_MANAGER },
    { type: ApprovalTransactionType.STOCK_ADJUSTMENT, min: "50", max: "500", role: Role.GENERAL_MANAGER },
    { type: ApprovalTransactionType.STOCK_ADJUSTMENT, min: "500", max: null, role: Role.OWNER },
    // Damage: <100 warehouse, 100–500 GM, >500 owner
    { type: ApprovalTransactionType.DAMAGE, min: null, max: "100", role: Role.WAREHOUSE_MANAGER },
    { type: ApprovalTransactionType.DAMAGE, min: "100", max: "500", role: Role.GENERAL_MANAGER },
    { type: ApprovalTransactionType.DAMAGE, min: "500", max: null, role: Role.OWNER },
    // Expenses: <500 GM, >=500 owner
    { type: ApprovalTransactionType.EXPENSE, min: null, max: "500", role: Role.GENERAL_MANAGER },
    { type: ApprovalTransactionType.EXPENSE, min: "500", max: null, role: Role.OWNER },
    // Daily income duplicate exception always needs GM
    { type: ApprovalTransactionType.DAILY_INCOME_EXCEPTION, min: null, max: null, role: Role.GENERAL_MANAGER },
  ];
  const existingRules = await prisma.approvalRule.count();
  if (existingRules === 0) {
    await prisma.approvalRule.createMany({
      data: approvalRules.map((r) => ({
        transactionType: r.type,
        minAmount: r.min ? new Prisma.Decimal(r.min) : null,
        maxAmount: r.max ? new Prisma.Decimal(r.max) : null,
        requiredRole: r.role,
        level: 1,
      })),
    });
  }

  // --- System settings ---------------------------------------------------
  const settings: Record<string, string> = {
    "attendance.workday_start": "08:00",
    "attendance.workday_end": "23:00",
    "attendance.late_after_minutes": "15",
    "attendance.max_break_minutes": "60",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  console.log("✅ Seed completed. Default password for all users: " + DEFAULT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
