"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ForgotState } from "@/lib/auth/auth-actions";
import { t } from "@/lib/i18n/ar";
import { Button, Card, FormField, Input } from "@/components/ui";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.done) {
    return (
      <Card>
        <p className="text-sm text-success text-center py-4">{t.auth.forgotSent}</p>
      </Card>
    );
  }

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <FormField label={t.auth.email} required>
          <Input name="email" type="email" dir="ltr" required placeholder="user@example.com" />
        </FormField>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t.common.loading : t.auth.send}
        </Button>
      </form>
    </Card>
  );
}
