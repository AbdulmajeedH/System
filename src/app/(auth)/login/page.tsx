import { redirect } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n/ar";
import { LoginForm } from "./login-form";

export const metadata = { title: t.auth.loginTitle };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <UtensilsCrossed className="size-7" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.app.name}</h1>
            <p className="text-sm text-muted mt-1">{t.app.tagline}</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
