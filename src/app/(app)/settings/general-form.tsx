"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select } from "@/components/ui";
import { updateGeneralSettings } from "./actions";

export function GeneralSettingsForm({
  initial,
}: {
  initial: {
    workdayStart: string;
    lateAfterMinutes: string;
    maxBreakMinutes: string;
    lowStockAlerts: string;
  };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateGeneralSettings,
    {},
  );

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <h2 className="font-bold">{t.settings.general}</h2>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label={t.settings.workdayStart}
            error={state.fieldErrors?.["attendance.workday_start"]}
          >
            <Input name="attendance.workday_start" type="time" defaultValue={initial.workdayStart} />
          </FormField>
          <FormField
            label={t.settings.lateAfterMinutes}
            error={state.fieldErrors?.["attendance.late_after_minutes"]}
          >
            <Input
              name="attendance.late_after_minutes"
              type="number"
              min="0"
              max="240"
              defaultValue={initial.lateAfterMinutes}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label={t.settings.maxBreakMinutes}
            error={state.fieldErrors?.["attendance.max_break_minutes"]}
          >
            <Input
              name="attendance.max_break_minutes"
              type="number"
              min="5"
              max="480"
              defaultValue={initial.maxBreakMinutes}
            />
          </FormField>
          <FormField label={t.settings.lowStockAlerts}>
            <Select name="inventory.low_stock_alerts" defaultValue={initial.lowStockAlerts}>
              <option value="1">{t.common.yes}</option>
              <option value="0">{t.common.no}</option>
            </Select>
          </FormField>
        </div>
        {state.success ? <p className="text-sm text-success">{t.common.savedSuccessfully}</p> : null}
        {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </form>
    </Card>
  );
}
