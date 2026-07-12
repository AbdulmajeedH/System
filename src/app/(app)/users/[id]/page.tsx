import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { updateUser } from "../actions";
import { UserForm } from "../user-form";
import { ResetPasswordForm, ToggleActiveButton } from "./manage-forms";

export const metadata = { title: t.users.editUser };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("users.manage");
  const { id } = await params;

  const [user, departments] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: "asc" },
    }),
  ]);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`${t.users.editUser}: ${user.name}`} />
      <UserForm
        action={updateUser.bind(null, user.id)}
        departments={departments}
        isCreate={false}
        initial={{
          name: user.name,
          email: user.email,
          phone: user.phone ?? "",
          role: user.role,
          departmentId: user.departmentId ?? "",
        }}
      />
      <div className="max-w-lg space-y-4">
        <ResetPasswordForm userId={user.id} />
        <ToggleActiveButton
          userId={user.id}
          isActive={user.isActive}
          isSelf={admin.id === user.id}
        />
      </div>
    </div>
  );
}
