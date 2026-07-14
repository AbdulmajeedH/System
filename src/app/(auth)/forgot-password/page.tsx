import Link from "next/link";
import { t } from "@/lib/i18n/ar";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: t.auth.forgotTitle };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t.auth.forgotTitle}</h1>
          <p className="text-sm text-muted">{t.auth.forgotHint}</p>
        </div>
        <ForgotForm />
        <p className="text-center">
          <Link href="/login" className="text-sm font-medium text-primary">
            {t.auth.backToLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
