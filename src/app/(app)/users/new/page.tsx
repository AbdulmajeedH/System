import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { createUser } from "../actions";
import { UserForm } from "../user-form";

export const metadata = { title: t.users.newUser };

export default async function NewUserPage() {
  await requirePermission("users.manage");

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, nameAr: true },
    orderBy: { nameAr: "asc" },
  });

  return (
    <div>
      <PageHeader title={t.users.newUser} />
      <UserForm action={createUser} departments={departments} isCreate />
    </div>
  );
}
