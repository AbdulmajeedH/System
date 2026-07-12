import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n/ar";
import { LoginForm } from "./login-form";

export const metadata = { title: t.auth.loginTitle };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{t.app.name}</h1>
          <p className="text-sm text-muted">{t.app.tagline}</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
