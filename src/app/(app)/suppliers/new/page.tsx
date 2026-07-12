import { requirePermission } from "@/lib/auth/guards";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { saveSupplier } from "../actions";
import { SupplierForm } from "../supplier-form";

export const metadata = { title: t.suppliers.newSupplier };

export default async function NewSupplierPage() {
  await requirePermission("supplier.manage");

  return (
    <div>
      <PageHeader title={t.suppliers.newSupplier} />
      <SupplierForm action={saveSupplier.bind(null, null)} />
    </div>
  );
}
