"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type ResetState } from "@/lib/auth/auth-actions";
import { t } from "@/lib/i18n/ar";
import { Button, Card, FormField, Input } from "@/components/ui";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(resetPassword, {});

  if (state.done) {
    return (
      <Card>
        <div className="space-y-4 py-2 text-center">
          <p className="text-sm text-success">{t.auth.resetDone}</p>
          <Link href="/login">
            <Button className="w-full">{t.auth.login}</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <FormField label={t.auth.newPassword} required hint={t.users.passwordHint}>
          <Input name="password" type="password" dir="ltr" required minLength={8} />
        </FormField>
        {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </form>
    </Card>
  );
}
