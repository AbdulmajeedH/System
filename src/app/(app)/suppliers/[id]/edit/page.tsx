import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { saveSupplier } from "../../actions";
import { SupplierForm } from "../../supplier-form";

export const metadata = { title: t.suppliers.editSupplier };

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("supplier.manage");
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div>
      <PageHeader title={`${t.suppliers.editSupplier}: ${supplier.nameAr}`} />
      <SupplierForm
        action={saveSupplier.bind(null, id)}
        initial={{
          nameAr: supplier.nameAr,
          contactPerson: supplier.contactPerson ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          taxNumber: supplier.taxNumber ?? "",
          address: supplier.address ?? "",
          categories: supplier.categories ?? "",
          paymentTerms: supplier.paymentTerms ?? "",
          notes: supplier.notes ?? "",
        }}
      />
    </div>
  );
}
