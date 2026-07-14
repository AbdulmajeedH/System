"use client";

import { useActionState } from "react";
import { AdjustmentKind } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";
import { createAdjustment } from "../actions";

export function AdjustmentForm({
  items,
  locations,
}: {
  items: Array<{ id: string; nameAr: string; sku: string }>;
  locations: Array<{ id: string; nameAr: string }>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createAdjustment, {});

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <Card className="space-y-4">
        <FormField label={t.invoices.item} required>
          <Select name="itemId" defaultValue="" required>
            <option value="" disabled>
              {t.common.search}...
            </option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nameAr} ({item.sku})
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.inventory.location} required>
            <Select name="locationId" defaultValue={locations[0]?.id} required>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.adjustments.kind} required>
            <Select name="kind" defaultValue={AdjustmentKind.MANUAL_INCREASE}>
              {Object.values(AdjustmentKind).map((kind) => (
                <option key={kind} value={kind}>
                  {t.adjustments.kinds[kind]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label={t.common.quantity} required error={state.fieldErrors?.quantity}>
          <Input name="quantity" type="number" inputMode="decimal" step="0.001" min="0.001" required />
        </FormField>
        <FormField label={t.common.reason} required>
          <Textarea name="reason" required maxLength={500} />
        </FormField>
      </Card>
      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t.common.loading : t.common.submit}
      </Button>
    </form>
  );
}
