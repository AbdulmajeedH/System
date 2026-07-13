import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { UnitsManager } from "./units-manager";

export const metadata = { title: t.settings.units };

export default async function UnitsPage() {
  await requirePermission("settings.manage");

  const [units, conversions] = await Promise.all([
    prisma.unitDef.findMany({ orderBy: { code: "asc" } }),
    prisma.unitConversion.findMany({
      include: {
        fromUnit: { select: { nameAr: true } },
        toUnit: { select: { nameAr: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title={t.settings.units} />
      <UnitsManager
        units={units.map((u) => ({ id: u.id, code: u.code, nameAr: u.nameAr }))}
        conversions={conversions.map((c) => ({
          id: c.id,
          fromName: c.fromUnit.nameAr,
          toName: c.toUnit.nameAr,
          factor: c.factor.toString(),
        }))}
      />
    </div>
  );
}
