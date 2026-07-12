"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input } from "@/components/ui";
import { resetUserPassword, setUserActive } from "../actions";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    resetUserPassword.bind(null, userId),
    {},
  );

  return (
    <Card>
      <form action={formAction} className="space-y-3">
        <FormField
          label={t.users.resetPassword}
          hint={t.users.passwordHint}
          error={state.fieldErrors?.password}
        >
          <Input name="password" type="password" dir="ltr" minLength={8} required />
        </FormField>
        {state.success ? <p className="text-sm text-success">{t.common.savedSuccessfully}</p> : null}
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? t.common.loading : t.users.resetPassword}
        </Button>
      </form>
    </Card>
  );
}

export function ToggleActiveButton({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf && isActive) return null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {isActive ? t.common.active : t.common.inactive}
        </p>
        <Button
          variant={isActive ? "danger" : "primary"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setUserActive(userId, !isActive);
              if (result.error) setError(result.error);
              else router.refresh();
            })
          }
        >
          {pending ? t.common.loading : isActive ? t.common.deactivate : t.common.activate}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger mt-2">{error}</p> : null}
    </Card>
  );
}
