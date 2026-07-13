import { requirePermission } from "@/lib/auth/guards";
import { can, departmentScope } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  ApprovalStatus,
  AttendanceEventType,
  InvoiceStatus,
  StockRequestStatus,
  SubmissionStatus,
} from "@/generated/prisma/enums";
import { roleSatisfies } from "@/lib/services/approvals";
import { t } from "@/lib/i18n/ar";
import { formatMoney, toDateInputValue } from "@/lib/utils/format";
import { Card } from "@/components/ui";
import { ColumnChart, HBarChart, StatTile } from "@/components/ui/charts";

export const metadata = { title: t.dashboard.title };

const zero = new Prisma.Decimal(0);
const dec = (v: Prisma.Decimal | null | undefined) => v ?? zero;

export default async function DashboardPage() {
  const user = await requirePermission("dashboard.view");
  const scope = departmentScope(user);
  const viewFinancials = can(user, "income.viewAll") || can(user, "income.submit");

  // @db.Date columns hold UTC midnight of the submitted yyyy-mm-dd string;
  // attendance timestamps are real instants compared against local midnight.
  const todayStr = toDateInputValue();
  const dateToday = new Date(`${todayStr}T00:00:00.000Z`);
  const dateMonthStart = new Date(`${todayStr.slice(0, 8)}01T00:00:00.000Z`);
  const dateTrendStart = new Date(dateToday);
  dateTrendStart.setUTCDate(dateTrendStart.getUTCDate() - 13);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const incomeWhere = {
    status: { not: SubmissionStatus.REJECTED },
    ...(scope ? { departmentId: scope } : {}),
  };

  const [
    todayIncome,
    todayExpenses,
    trendRows,
    byDeptRows,
    departments,
    todaySubmissions,
    pendingApprovals,
    pendingInvoices,
    pendingRequests,
    balances,
    presentEvents,
    monthPurchases,
    monthDamages,
  ] = await Promise.all([
    prisma.dailyIncomeSubmission.aggregate({
      where: { ...incomeWhere, date: dateToday },
      _sum: {
        totalIncome: true,
        cashIncome: true,
        cardIncome: true,
        bankTransferIncome: true,
        cashExpenses: true,
        cashDifference: true,
      },
    }),
    prisma.expense.aggregate({
      where: {
        date: dateToday,
        status: { not: ApprovalStatus.REJECTED },
        ...(scope ? { departmentId: scope } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.dailyIncomeSubmission.findMany({
      where: { ...incomeWhere, date: { gte: dateTrendStart } },
      select: { date: true, totalIncome: true },
    }),
    scope
      ? Promise.resolve([])
      : prisma.dailyIncomeSubmission.groupBy({
          by: ["departmentId"],
          where: { ...incomeWhere, date: dateToday },
          _sum: { totalIncome: true },
        }),
    prisma.department.findMany({ where: { isActive: true } }),
    prisma.dailyIncomeSubmission.findMany({
      where: { ...incomeWhere, date: dateToday },
      select: { departmentId: true },
    }),
    can(user, "approvals.act")
      ? prisma.approvalRequest.findMany({ where: { status: ApprovalStatus.PENDING } })
      : Promise.resolve([]),
    can(user, "invoice.manage") || can(user, "invoice.approve")
      ? prisma.purchaseInvoice.count({ where: { status: InvoiceStatus.SUBMITTED } })
      : Promise.resolve(0),
    can(user, "warehouse.manage")
      ? prisma.stockRequest.count({ where: { status: StockRequestStatus.SUBMITTED } })
      : prisma.stockRequest.count({
          where: {
            status: StockRequestStatus.DELIVERED,
            ...(scope ? { departmentId: scope } : {}),
          },
        }),
    prisma.inventoryBalance.findMany({
      where: scope ? { location: { departmentId: scope } } : {},
      include: { item: { select: { averageCost: true, minStock: true } } },
    }),
    can(user, "attendance.viewAll") || can(user, "attendance.viewDept")
      ? prisma.attendanceEvent.findMany({
          where: {
            timestamp: { gte: startOfToday },
            ...(scope ? { departmentId: scope } : {}),
          },
          orderBy: { timestamp: "asc" },
        })
      : Promise.resolve([]),
    scope
      ? Promise.resolve(null)
      : prisma.purchaseInvoice.aggregate({
          where: {
            status: { in: [InvoiceStatus.APPROVED, InvoiceStatus.RECEIVED] },
            invoiceDate: { gte: dateMonthStart },
          },
          _sum: { total: true },
        }),
    prisma.damageRecord.aggregate({
      where: {
        status: ApprovalStatus.APPROVED,
        date: { gte: dateMonthStart },
        ...(scope ? { location: { departmentId: scope } } : {}),
      },
      _sum: { estimatedCost: true },
    }),
  ]);

  // Inventory value and low-stock detection from balances.
  let inventoryValue = zero;
  const totalsByItem = new Map<string, { qty: Prisma.Decimal; minStock: Prisma.Decimal }>();
  for (const b of balances) {
    inventoryValue = inventoryValue.add(b.quantity.mul(b.item.averageCost));
    const entry = totalsByItem.get(b.itemId);
    if (entry) entry.qty = entry.qty.add(b.quantity);
    else totalsByItem.set(b.itemId, { qty: b.quantity, minStock: b.item.minStock });
  }
  const lowStockCount = [...totalsByItem.values()].filter((v) => v.qty.lte(v.minStock)).length;

  // Present employees: last event today per user is IN or BREAK.
  const lastByUser = new Map<string, AttendanceEventType>();
  for (const e of presentEvents) lastByUser.set(e.userId, e.type);
  const presentCount = [...lastByUser.values()].filter(
    (type) => type !== AttendanceEventType.CHECK_OUT,
  ).length;

  // Missing submissions today (all-departments view only).
  const submittedDepts = new Set(todaySubmissions.map((s) => s.departmentId));
  const missingDepts = scope ? [] : departments.filter((d) => !submittedDepts.has(d.id));

  const actionableApprovals = pendingApprovals.filter((r) =>
    roleSatisfies(user.role, r.requiredRole),
  ).length;

  // 14-day trend.
  const trendByDay = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(dateTrendStart);
    d.setUTCDate(d.getUTCDate() + i);
    trendByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of trendRows) {
    const key = row.date.toISOString().slice(0, 10);
    trendByDay.set(key, (trendByDay.get(key) ?? 0) + Number(row.totalIncome));
  }
  const trendData = [...trendByDay.entries()].map(([date, value]) => ({
    label: date.slice(8), // day of month
    value,
  }));

  const deptNameById = new Map(departments.map((d) => [d.id, d.nameAr]));
  const byDeptData = byDeptRows.map((row) => ({
    label: deptNameById.get(row.departmentId) ?? row.departmentId,
    value: Number(dec(row._sum.totalIncome)),
  }));

  const sums = todayIncome._sum;
  const money = (v: Prisma.Decimal | number) => formatMoney(v.toString());
  const hasTrend = trendData.some((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-3">
            <p className="text-sm font-medium text-white/70">{todayStr}</p>
            <h1 className="text-4xl font-bold leading-[44px] sm:text-[52px] sm:leading-[64px]">{t.dashboard.operationsLedger}</h1>
            <p className="max-w-2xl text-base leading-6 text-white/70">
              {t.dashboard.ledgerSubtitle} · {user.name} · {t.roles[user.role]}
              {user.departmentName ? ` — ${user.departmentName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-full bg-white/10 p-1">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-primary">{t.dashboard.today}</span>
            <span className="rounded-full px-4 py-2 text-sm font-medium text-white/70">{t.dashboard.thisMonth}</span>
            <span className="rounded-full px-4 py-2 text-sm font-medium text-white/70">{user.departmentName ?? t.dashboard.allDepartments}</span>
          </div>
        </div>
      </section>

      {viewFinancials ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label={t.dashboard.todayIncome} value={money(dec(sums.totalIncome))} suffix={t.app.currency} />
          <StatTile label={t.dashboard.todayExpenses} value={money(dec(todayExpenses._sum.amount))} suffix={t.app.currency} />
          <StatTile
            label={t.dashboard.todayNet}
            value={money(dec(sums.totalIncome).sub(dec(sums.cashExpenses)).sub(dec(todayExpenses._sum.amount)))}
            suffix={t.app.currency}
          />
          <StatTile
            label={t.dashboard.cashDifferencesToday}
            value={money(dec(sums.cashDifference))}
            suffix={t.app.currency}
            tone={dec(sums.cashDifference).isZero() ? "success" : "danger"}
          />
          <StatTile label={t.dashboard.cashToday} value={money(dec(sums.cashIncome))} suffix={t.app.currency} />
          <StatTile label={t.dashboard.cardToday} value={money(dec(sums.cardIncome))} suffix={t.app.currency} />
          <StatTile label={t.dashboard.bankToday} value={money(dec(sums.bankTransferIncome))} suffix={t.app.currency} />
          {monthPurchases ? (
            <StatTile label={t.dashboard.monthPurchases} value={money(dec(monthPurchases._sum.total))} suffix={t.app.currency} />
          ) : (
            <StatTile label={t.dashboard.damagesMonth} value={money(dec(monthDamages._sum.estimatedCost))} suffix={t.app.currency} />
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {can(user, "inventory.view") ? (
          <>
            <StatTile label={t.dashboard.inventoryValue} value={money(inventoryValue)} suffix={t.app.currency} />
            <StatTile
              label={t.dashboard.lowStockItems}
              value={String(lowStockCount)}
              tone={lowStockCount > 0 ? "warning" : "success"}
            />
          </>
        ) : null}
        {can(user, "approvals.act") ? (
          <StatTile
            label={t.dashboard.pendingApprovals}
            value={String(actionableApprovals)}
            tone={actionableApprovals > 0 ? "warning" : undefined}
          />
        ) : null}
        {can(user, "invoice.manage") || can(user, "invoice.approve") ? (
          <StatTile label={t.dashboard.pendingInvoices} value={String(pendingInvoices)} />
        ) : null}
        <StatTile label={t.dashboard.pendingRequests} value={String(pendingRequests)} />
        {can(user, "attendance.viewAll") || can(user, "attendance.viewDept") ? (
          <StatTile label={t.dashboard.presentEmployees} value={String(presentCount)} />
        ) : null}
        {!scope && viewFinancials ? (
          <StatTile
            label={t.dashboard.missingSubmissions}
            value={missingDepts.length > 0 ? missingDepts.map((d) => d.nameAr).join("، ") : "0"}
            tone={missingDepts.length > 0 ? "danger" : "success"}
          />
        ) : null}
      </div>

      {viewFinancials ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-black">{t.dashboard.incomeTrend}</h2>
            {hasTrend ? (
              <ColumnChart data={trendData} />
            ) : (
              <p className="rounded-2xl bg-canvas-soft p-8 text-center text-sm text-muted">{t.dashboard.noData}</p>
            )}
          </Card>
          {byDeptData.length > 0 ? (
            <Card>
              <h2 className="mb-4 text-lg font-black">{t.dashboard.incomeByDepartment}</h2>
              <HBarChart data={byDeptData} />
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
