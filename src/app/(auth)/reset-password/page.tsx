import Link from "next/link";
import { t } from "@/lib/i18n/ar";
import { ResetForm } from "./reset-form";

export const metadata = { title: t.auth.resetTitle };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-bold tracking-tight">{t.auth.resetTitle}</h1>
        <ResetForm token={token ?? ""} />
        <p className="text-center">
          <Link href="/login" className="text-sm font-medium text-primary">
            {t.auth.backToLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
