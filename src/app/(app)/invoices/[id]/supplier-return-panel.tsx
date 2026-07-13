"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Textarea } from "@/components/ui";
import { returnToSupplier } from "../actions";

export function SupplierReturnPanel({
  invoiceId,
  lines,
}: {
  invoiceId: string;
  lines: Array<{ itemId: string; nameAr: string; quantity: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    returnToSupplier.bind(null, invoiceId),
    {},
  );

  if (!open) {
    return (
      <Card>
        <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
          {t.supplierReturns.title}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <h2 className="font-bold">{t.supplierReturns.title}</h2>
        <p className="text-xs text-muted">{t.supplierReturns.hint}</p>
        {lines.map((line) => (
          <div key={line.itemId} className="flex items-center justify-between gap-3">
            <span className="text-sm">
              {line.nameAr}{" "}
              <span className="text-xs text-muted dir-ltr">({line.quantity})</span>
            </span>
            <Input
              name={`return_${line.itemId}`}
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              placeholder="0"
              className="w-28"
            />
          </div>
        ))}
        <FormField label={t.common.reason} required error={state.fieldErrors?.reason}>
          <Textarea name="reason" required />
        </FormField>
        {state.success ? <p className="text-sm text-success">{t.supplierReturns.done}</p> : null}
        {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? t.common.loading : t.supplierReturns.submit}
        </Button>
      </form>
    </Card>
  );
}
