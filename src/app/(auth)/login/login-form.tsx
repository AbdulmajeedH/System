"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/auth-actions";
import { t } from "@/lib/i18n/ar";
import { Button, Card, FormField, Input } from "@/components/ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <FormField label={t.auth.email} required>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            required
            placeholder="user@example.com"
          />
        </FormField>
        <FormField label={t.auth.password} required>
          <Input name="password" type="password" autoComplete="current-password" dir="ltr" required />
        </FormField>
        {state.error ? (
          <p className="text-sm text-danger" role="alert">{state.error}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t.common.loading : t.auth.login}
        </Button>
      </form>
    </Card>
  );
}
