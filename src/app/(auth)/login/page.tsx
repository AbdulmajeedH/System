import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n/ar";
import { LoginForm } from "./login-form";

export const metadata = { title: t.auth.loginTitle };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="grid min-h-dvh bg-primary text-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-[42dvh] flex-col justify-between p-6 sm:p-10 lg:min-h-dvh">
        <div className="flex size-14 items-center justify-center rounded-full bg-white text-lg font-bold text-black">{t.ui.brandMark}</div>
        <div className="max-w-xl space-y-5 py-12">
          <p className="text-sm font-bold text-white/60">{t.auth.loginEyebrow}</p>
          <h1 className="text-4xl font-bold leading-[44px] sm:text-[52px] sm:leading-[64px]">{t.app.name}</h1>
          <p className="text-lg leading-8 text-white/70">{t.app.tagline}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-white/60">
          <span className="rounded-full bg-white/10 p-3">{t.ui.inventory}</span>
          <span className="rounded-full bg-white/10 p-3">{t.ui.purchasing}</span>
          <span className="rounded-full bg-white/10 p-3">{t.ui.reports}</span>
        </div>
      </section>
      <section className="flex items-center justify-center bg-background p-4 text-foreground sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-bold text-muted">{t.auth.loginTitle}</p>
            <h2 className="text-4xl font-bold leading-[44px]">{t.auth.loginWelcome}</h2>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
