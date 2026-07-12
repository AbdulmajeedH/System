import Link from "next/link";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n/ar";
import { formatDateTime } from "@/lib/utils/format";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: t.users.title };

export default async function UsersPage() {
  await requirePermission("users.manage");

  const users = await prisma.user.findMany({
    include: { department: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title={t.users.title}
        action={
          <Link href="/users/new">
            <Button>{t.users.newUser}</Button>
          </Link>
        }
      />
      <div className="space-y-3">
        {users.length === 0 ? (
          <Card>
            <EmptyState message={t.common.noResults} />
          </Card>
        ) : (
          users.map((user) => (
            <Link key={user.id} href={`/users/${user.id}`} className="block">
              <Card className="hover:border-primary transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted dir-ltr">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{t.roles[user.role]}</Badge>
                    {user.department ? <Badge tone="teal">{user.department.nameAr}</Badge> : null}
                    <Badge tone={user.isActive ? "green" : "red"}>
                      {user.isActive ? t.common.active : t.common.inactive}
                    </Badge>
                  </div>
                </div>
                {user.lastLoginAt ? (
                  <p className="text-xs text-muted mt-2">
                    {t.users.lastLogin}: {formatDateTime(user.lastLoginAt)}
                  </p>
                ) : null}
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
