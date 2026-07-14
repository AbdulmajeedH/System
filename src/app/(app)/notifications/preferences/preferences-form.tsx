"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n/ar";
import { NOTIFICATION_TYPES } from "@/lib/services/notifications";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card } from "@/components/ui";
import { saveNotificationPreferences } from "../actions";

export function PreferencesForm({ disabledTypes }: { disabledTypes: string[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveNotificationPreferences,
    {},
  );
  const disabled = new Set(disabledTypes);

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <p className="text-xs text-muted">{t.notifications.preferencesHint}</p>
        <ul className="divide-y divide-border">
          {NOTIFICATION_TYPES.map((type) => (
            <li key={type} className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm font-medium">
                {t.notifications.types[type] ?? type}
              </span>
              <input
                type="checkbox"
                name={`pref_${type}`}
                defaultChecked={!disabled.has(type)}
                className="size-5 accent-[var(--primary)]"
              />
            </li>
          ))}
        </ul>
        {state.success ? <p className="text-sm text-success">{t.common.savedSuccessfully}</p> : null}
        {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </form>
    </Card>
  );
}
