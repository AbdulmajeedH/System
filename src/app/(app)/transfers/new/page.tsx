import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { Role } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { TransferForm } from "./transfer-form";

export const metadata = { title: t.transfers.newTransfer };

export default async function NewTransferPage() {
  const user = await requireUser();
  const isWarehouse = can(user, "warehouse.manage") || user.role === Role.OWNER;
  const isDept = user.departmentId !== null && can(user, "stock.request");
  if (!isWarehouse && !isDept) redirect("/transfers");

  const [locations, items] = await Promise.all([
    prisma.inventoryLocation.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, code: true, departmentId: true },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, sku: true },
      orderBy: { nameAr: "asc" },
    }),
  ]);

  // Department users: fixed direction own-location → main warehouse (return).
  const ownLocation = locations.find((l) => l.departmentId === user.departmentId) ?? null;
  const warehouse = locations.find((l) => l.code === "MAIN_WAREHOUSE") ?? null;

  return (
    <div>
      <PageHeader title={isWarehouse ? t.transfers.newTransfer : t.transfers.returnToWarehouse} />
      <TransferForm
        items={items}
        locations={locations.map((l) => ({ id: l.id, nameAr: l.nameAr }))}
        lockedFrom={isWarehouse ? null : ownLocation?.id ?? null}
        lockedTo={isWarehouse ? null : warehouse?.id ?? null}
      />
    </div>
  );
}
