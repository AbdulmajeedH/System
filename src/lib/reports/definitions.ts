// Report engine: each report declares its filters, columns, and a query
// that returns pre-formatted string rows from live data. Used by the
// /reports pages and the CSV export route.
import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { ApprovalStatus, AttendanceEventType, SubmissionStatus } from "@/generated/prisma/enums";
import {
  parseAttendanceSettings,
  warningsForDay,
} from "@/lib/services/attendance";
import { t } from "@/lib/i18n/ar";

const D0 = new Prisma.Decimal(0);

export type ReportFilterKey =
  | "from"
  | "to"
  | "departmentId"
  | "supplierId"
  | "itemId"
  | "locationId"
  | "userId"
  | "status";

export type ReportFilters = Partial<Record<ReportFilterKey, string>>;

export type ReportDefinition = {
  filters: ReportFilterKey[];
  columns: Array<{ key: string; label: string }>;
  query: (filters: ReportFilters) => Promise<Array<Record<string, string>>>;
};

function dateRange(filters: ReportFilters, field = "date") {
  const where: Record<string, unknown> = {};
  const bounds: Record<string, Date> = {};
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
    bounds.gte = new Date(`${filters.from}T00:00:00.000Z`);
  }
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    bounds.lte = new Date(`${filters.to}T23:59:59.999Z`);
  }
  if (Object.keys(bounds).length > 0) where[field] = bounds;
  return where;
}

const d = (v: Date) => v.toISOString().slice(0, 10);
const dt = (v: Date) => v.toISOString().slice(0, 16).replace("T", " ");
const money = (v: Prisma.Decimal | null | undefined) => (v ?? D0).toFixed(2);
const qty = (v: Prisma.Decimal | null | undefined) => (v ?? D0).toString();

export const REPORTS: Record<string, ReportDefinition> = {
  "daily-income": {
    filters: ["from", "to", "departmentId", "status"],
    columns: [
      { key: "date", label: t.common.date },
      { key: "department", label: t.common.department },
      { key: "shift", label: t.income.shift },
      { key: "cash", label: t.income.cashIncome },
      { key: "card", label: t.income.cardIncome },
      { key: "total", label: t.income.totalIncome },
      { key: "difference", label: t.income.cashDifference },
      { key: "status", label: t.common.status },
      { key: "submittedBy", label: t.income.submittedBy },
    ],
    query: async (filters) => {
      const rows = await prisma.dailyIncomeSubmission.findMany({
        where: {
          ...dateRange(filters),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
          ...(filters.status ? { status: filters.status as SubmissionStatus } : {}),
        },
        include: { department: true, submittedBy: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 1000,
      });
      return rows.map((r) => ({
        date: d(r.date),
        department: r.department.nameAr,
        shift: t.shifts[r.shiftType],
        cash: money(r.cashIncome),
        card: money(r.cardIncome),
        total: money(r.totalIncome),
        difference: money(r.cashDifference),
        status: t.statuses[r.status],
        submittedBy: r.submittedBy.name,
      }));
    },
  },

  "department-income": {
    filters: ["from", "to"],
    columns: [
      { key: "department", label: t.common.department },
      { key: "submissions", label: t.reports.rows },
      { key: "total", label: t.income.totalIncome },
      { key: "cash", label: t.income.cashIncome },
      { key: "card", label: t.income.cardIncome },
      { key: "difference", label: t.income.cashDifference },
    ],
    query: async (filters) => {
      const groups = await prisma.dailyIncomeSubmission.groupBy({
        by: ["departmentId"],
        where: { ...dateRange(filters), status: { not: SubmissionStatus.REJECTED } },
        _count: { _all: true },
        _sum: { totalIncome: true, cashIncome: true, cardIncome: true, cashDifference: true },
      });
      const departments = await prisma.department.findMany();
      const nameById = new Map(departments.map((x) => [x.id, x.nameAr]));
      return groups.map((g) => ({
        department: nameById.get(g.departmentId) ?? g.departmentId,
        submissions: String(g._count._all),
        total: money(g._sum.totalIncome),
        cash: money(g._sum.cashIncome),
        card: money(g._sum.cardIncome),
        difference: money(g._sum.cashDifference),
      }));
    },
  },

  expenses: {
    filters: ["from", "to", "departmentId", "supplierId", "status"],
    columns: [
      { key: "date", label: t.common.date },
      { key: "department", label: t.common.department },
      { key: "category", label: t.expenses.category },
      { key: "amount", label: t.common.amount },
      { key: "method", label: t.expenses.paymentMethod },
      { key: "status", label: t.common.status },
      { key: "submittedBy", label: t.expenses.submittedBy },
      { key: "description", label: t.expenses.description },
    ],
    query: async (filters) => {
      const rows = await prisma.expense.findMany({
        where: {
          ...dateRange(filters),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
          ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
          ...(filters.status ? { status: filters.status as ApprovalStatus } : {}),
        },
        include: {
          department: { select: { nameAr: true } },
          category: { select: { nameAr: true } },
          submittedBy: { select: { name: true } },
        },
        orderBy: { date: "desc" },
        take: 1000,
      });
      return rows.map((r) => ({
        date: d(r.date),
        department: r.department?.nameAr ?? "—",
        category: r.category.nameAr,
        amount: money(r.amount),
        method: t.paymentMethods[r.paymentMethod],
        status: t.statuses[r.status],
        submittedBy: r.submittedBy.name,
        description: r.description,
      }));
    },
  },

  purchases: {
    filters: ["from", "to", "supplierId", "status"],
    columns: [
      { key: "date", label: t.invoices.invoiceDate },
      { key: "number", label: t.invoices.invoiceNumber },
      { key: "supplier", label: t.invoices.supplier },
      { key: "subtotal", label: t.invoices.subtotal },
      { key: "vat", label: t.invoices.vat },
      { key: "total", label: t.invoices.grandTotal },
      { key: "status", label: t.common.status },
    ],
    query: async (filters) => {
      const rows = await prisma.purchaseInvoice.findMany({
        where: {
          ...dateRange(filters, "invoiceDate"),
          ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
          ...(filters.status ? { status: filters.status as never } : {}),
        },
        include: { supplier: { select: { nameAr: true } } },
        orderBy: { invoiceDate: "desc" },
        take: 1000,
      });
      return rows.map((r) => ({
        date: d(r.invoiceDate),
        number: r.invoiceNumber,
        supplier: r.supplier.nameAr,
        subtotal: money(r.subtotal),
        vat: money(r.vat),
        total: money(r.total),
        status: t.statuses[r.status],
      }));
    },
  },

  "supplier-spending": {
    filters: ["from", "to"],
    columns: [
      { key: "supplier", label: t.invoices.supplier },
      { key: "invoices", label: t.reports.rows },
      { key: "total", label: t.invoices.grandTotal },
    ],
    query: async (filters) => {
      const groups = await prisma.purchaseInvoice.groupBy({
        by: ["supplierId"],
        where: { ...dateRange(filters, "invoiceDate"), status: { in: ["APPROVED", "RECEIVED"] } },
        _count: { _all: true },
        _sum: { total: true },
      });
      const suppliers = await prisma.supplier.findMany();
      const nameById = new Map(suppliers.map((s) => [s.id, s.nameAr]));
      return groups
        .sort((a, b) => Number(b._sum.total ?? 0) - Number(a._sum.total ?? 0))
        .map((g) => ({
          supplier: nameById.get(g.supplierId) ?? g.supplierId,
          invoices: String(g._count._all),
          total: money(g._sum.total),
        }));
    },
  },

  "inventory-balances": {
    filters: ["locationId", "itemId"],
    columns: [
      { key: "item", label: t.invoices.item },
      { key: "sku", label: t.inventory.sku },
      { key: "location", label: t.inventory.location },
      { key: "quantity", label: t.common.quantity },
      { key: "minStock", label: t.inventory.minStock },
    ],
    query: async (filters) => {
      const rows = await prisma.inventoryBalance.findMany({
        where: {
          ...(filters.locationId ? { locationId: filters.locationId } : {}),
          ...(filters.itemId ? { itemId: filters.itemId } : {}),
        },
        include: { item: true, location: true },
        orderBy: { item: { nameAr: "asc" } },
        take: 2000,
      });
      return rows.map((r) => ({
        item: r.item.nameAr,
        sku: r.item.sku,
        location: r.location.nameAr,
        quantity: qty(r.quantity),
        minStock: qty(r.item.minStock),
      }));
    },
  },

  "inventory-valuation": {
    filters: ["locationId"],
    columns: [
      { key: "item", label: t.invoices.item },
      { key: "location", label: t.inventory.location },
      { key: "quantity", label: t.common.quantity },
      { key: "avgCost", label: t.inventory.averageCost },
      { key: "value", label: t.dashboard.inventoryValue },
    ],
    query: async (filters) => {
      const rows = await prisma.inventoryBalance.findMany({
        where: filters.locationId ? { locationId: filters.locationId } : {},
        include: { item: true, location: true },
        orderBy: { item: { nameAr: "asc" } },
        take: 2000,
      });
      return rows.map((r) => ({
        item: r.item.nameAr,
        location: r.location.nameAr,
        quantity: qty(r.quantity),
        avgCost: r.item.averageCost.toFixed(4),
        value: money(r.quantity.mul(r.item.averageCost)),
      }));
    },
  },

  "inventory-movements": {
    filters: ["from", "to", "itemId", "locationId", "userId"],
    columns: [
      { key: "time", label: t.audit.time },
      { key: "item", label: t.invoices.item },
      { key: "type", label: t.inventory.movementType },
      { key: "quantity", label: t.common.quantity },
      { key: "fromLoc", label: t.transfers.from },
      { key: "toLoc", label: t.transfers.to },
      { key: "user", label: t.common.user },
      { key: "reason", label: t.common.reason },
    ],
    query: async (filters) => {
      const rows = await prisma.inventoryMovement.findMany({
        where: {
          ...dateRange(filters, "createdAt"),
          ...(filters.itemId ? { itemId: filters.itemId } : {}),
          ...(filters.userId ? { userId: filters.userId } : {}),
          ...(filters.locationId
            ? {
                OR: [
                  { sourceLocationId: filters.locationId },
                  { destLocationId: filters.locationId },
                ],
              }
            : {}),
        },
        include: {
          item: { select: { nameAr: true } },
          sourceLocation: { select: { nameAr: true } },
          destLocation: { select: { nameAr: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      return rows.map((r) => ({
        time: dt(r.createdAt),
        item: r.item.nameAr,
        type: t.movementTypes[r.type],
        quantity: qty(r.quantity),
        fromLoc: r.sourceLocation?.nameAr ?? "—",
        toLoc: r.destLocation?.nameAr ?? "—",
        user: r.user.name,
        reason: r.reason ?? "",
      }));
    },
  },

  "stock-requests": {
    filters: ["from", "to", "departmentId", "status"],
    columns: [
      { key: "date", label: t.common.date },
      { key: "department", label: t.common.department },
      { key: "requiredDate", label: t.stockRequests.requiredDate },
      { key: "priority", label: t.stockRequests.priority },
      { key: "items", label: t.inventory.items },
      { key: "status", label: t.common.status },
      { key: "requestedBy", label: t.stockRequests.requestedBy },
    ],
    query: async (filters) => {
      const rows = await prisma.stockRequest.findMany({
        where: {
          ...dateRange(filters, "createdAt"),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
          ...(filters.status ? { status: filters.status as never } : {}),
        },
        include: {
          department: { select: { nameAr: true } },
          requestedBy: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      return rows.map((r) => ({
        date: d(r.createdAt),
        department: r.department.nameAr,
        requiredDate: d(r.requiredDate),
        priority: t.stockRequests.priorities[r.priority],
        items: String(r._count.items),
        status: t.statuses[r.status],
        requestedBy: r.requestedBy.name,
      }));
    },
  },

  "stock-count-differences": {
    filters: ["from", "to", "locationId"],
    columns: [
      { key: "date", label: t.stockCounts.countDate },
      { key: "location", label: t.inventory.location },
      { key: "item", label: t.invoices.item },
      { key: "systemQty", label: t.stockCounts.systemQty },
      { key: "actualQty", label: t.stockCounts.actualQty },
      { key: "difference", label: t.stockCounts.difference },
      { key: "value", label: t.stockCounts.differenceValue },
      { key: "status", label: t.common.status },
    ],
    query: async (filters) => {
      const rows = await prisma.stockCountItem.findMany({
        where: {
          difference: { not: D0 },
          count: {
            ...dateRange(filters, "countDate"),
            ...(filters.locationId ? { locationId: filters.locationId } : {}),
          },
        },
        include: {
          count: { include: { location: { select: { nameAr: true } } } },
          item: { select: { nameAr: true } },
        },
        orderBy: { count: { countDate: "desc" } },
        take: 2000,
      });
      return rows.map((r) => ({
        date: d(r.count.countDate),
        location: r.count.location.nameAr,
        item: r.item.nameAr,
        systemQty: qty(r.systemQty),
        actualQty: qty(r.actualQty),
        difference: qty(r.difference),
        value: money(r.differenceValue),
        status: t.statuses[r.count.status],
      }));
    },
  },

  damages: {
    filters: ["from", "to", "locationId", "itemId", "status"],
    columns: [
      { key: "date", label: t.common.date },
      { key: "item", label: t.invoices.item },
      { key: "location", label: t.inventory.location },
      { key: "type", label: t.damages.type },
      { key: "quantity", label: t.common.quantity },
      { key: "cost", label: t.damages.estimatedCost },
      { key: "status", label: t.common.status },
      { key: "reason", label: t.common.reason },
    ],
    query: async (filters) => {
      const rows = await prisma.damageRecord.findMany({
        where: {
          ...dateRange(filters),
          ...(filters.locationId ? { locationId: filters.locationId } : {}),
          ...(filters.itemId ? { itemId: filters.itemId } : {}),
          ...(filters.status ? { status: filters.status as ApprovalStatus } : {}),
        },
        include: {
          item: { select: { nameAr: true } },
          location: { select: { nameAr: true } },
        },
        orderBy: { date: "desc" },
        take: 1000,
      });
      return rows.map((r) => ({
        date: d(r.date),
        item: r.item.nameAr,
        location: r.location.nameAr,
        type: t.damages.types[r.type],
        quantity: qty(r.quantity),
        cost: money(r.estimatedCost),
        status: t.statuses[r.status],
        reason: r.reason,
      }));
    },
  },

  attendance: {
    filters: ["from", "to", "departmentId", "userId"],
    columns: [
      { key: "time", label: t.audit.time },
      { key: "user", label: t.common.employee },
      { key: "department", label: t.common.department },
      { key: "event", label: t.audit.action },
    ],
    query: async (filters) => {
      const rows = await prisma.attendanceEvent.findMany({
        where: {
          ...dateRange(filters, "timestamp"),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
          ...(filters.userId ? { userId: filters.userId } : {}),
        },
        include: {
          user: { select: { name: true } },
          department: { select: { nameAr: true } },
        },
        orderBy: { timestamp: "desc" },
        take: 2000,
      });
      return rows.map((r) => ({
        time: dt(r.timestamp),
        user: r.user.name,
        department: r.department?.nameAr ?? "—",
        event: t.attendance.events[r.type],
      }));
    },
  },

  lateness: {
    filters: ["from", "to", "departmentId"],
    columns: [
      { key: "date", label: t.common.date },
      { key: "user", label: t.common.employee },
      { key: "checkIn", label: t.attendance.checkIn },
      { key: "warnings", label: t.attendance.report },
    ],
    query: async (filters) => {
      const settingsRows = await prisma.systemSetting.findMany({
        where: { key: { startsWith: "attendance." } },
      });
      const settings = parseAttendanceSettings(
        Object.fromEntries(settingsRows.map((s) => [s.key, s.value])),
      );
      const events = await prisma.attendanceEvent.findMany({
        where: {
          ...dateRange(filters, "timestamp"),
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        },
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: "asc" },
        take: 5000,
      });
      // Group per user per day, derive warnings.
      const byUserDay = new Map<string, { name: string; events: typeof events }>();
      for (const event of events) {
        const key = `${event.userId}|${event.timestamp.toISOString().slice(0, 10)}`;
        const bucket = byUserDay.get(key) ?? { name: event.user.name, events: [] };
        bucket.events.push(event);
        byUserDay.set(key, bucket);
      }
      const rows: Array<Record<string, string>> = [];
      for (const [key, bucket] of byUserDay) {
        const warnings = warningsForDay(bucket.events, settings, true);
        if (warnings.length === 0) continue;
        const checkIn = bucket.events.find((e) => e.type === AttendanceEventType.CHECK_IN);
        rows.push({
          date: key.split("|")[1],
          user: bucket.name,
          checkIn: checkIn ? dt(checkIn.timestamp) : "—",
          warnings: warnings.map((w) => t.attendance.warnings[w]).join("، "),
        });
      }
      return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    },
  },

  "approval-history": {
    filters: ["from", "to", "userId"],
    columns: [
      { key: "time", label: t.audit.time },
      { key: "type", label: t.settings.ruleType },
      { key: "amount", label: t.common.amount },
      { key: "decision", label: t.common.status },
      { key: "user", label: t.common.user },
      { key: "comment", label: t.expenses.approvalComment },
    ],
    query: async (filters) => {
      const rows = await prisma.approvalAction.findMany({
        where: {
          ...dateRange(filters, "createdAt"),
          ...(filters.userId ? { userId: filters.userId } : {}),
        },
        include: {
          request: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      return rows.map((r) => ({
        time: dt(r.createdAt),
        type: t.approvals.types[r.request.transactionType],
        amount: r.request.amount ? money(r.request.amount) : "—",
        decision: t.statuses[r.decision],
        user: r.user.name,
        comment: r.comment ?? "",
      }));
    },
  },

  "audit-activity": {
    filters: ["from", "to", "userId"],
    columns: [
      { key: "time", label: t.audit.time },
      { key: "action", label: t.audit.action },
      { key: "entity", label: t.audit.entity },
      { key: "user", label: t.common.user },
    ],
    query: async (filters) => {
      const rows = await prisma.auditLog.findMany({
        where: {
          ...dateRange(filters, "createdAt"),
          ...(filters.userId ? { userId: filters.userId } : {}),
        },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 2000,
      });
      return rows.map((r) => ({
        time: dt(r.createdAt),
        action: r.action,
        entity: r.entityType ? `${r.entityType}${r.entityId ? ` (${r.entityId.slice(-6)})` : ""}` : "—",
        user: r.user?.name ?? "—",
      }));
    },
  },
};
