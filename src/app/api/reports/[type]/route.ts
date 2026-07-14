import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/services/audit";
import { REPORTS, type ReportFilters } from "@/lib/reports/definitions";

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Excel-compatible CSV export (UTF-8 BOM so Arabic opens correctly). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !can(user, "reports.view")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { type } = await params;
  const definition = REPORTS[type];
  if (!definition) {
    return NextResponse.json({ error: "unknown report" }, { status: 404 });
  }

  const filters: ReportFilters = {};
  for (const key of definition.filters) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) filters[key] = value;
  }

  const rows = await definition.query(filters);
  const header = definition.columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((row) => definition.columns.map((c) => csvEscape(row[c.key] ?? "")).join(","))
    .join("\r\n");
  const csv = `﻿${header}\r\n${body}\r\n`;

  await audit({
    userId: user.id,
    action: "reports.export",
    metadata: { type, rows: rows.length, ...filters },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
