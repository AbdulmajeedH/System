"use client";

import { useActionState } from "react";
import { DamageType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { toDateInputValue } from "@/lib/utils/format";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";
import { createDamage } from "./actions";

type Option = { id: string; nameAr: string };

export function DamageForm({
  items,
  locations,
}: {
  items: Array<Option & { sku: string }>;
  locations: Option[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createDamage, {});

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <Card className="space-y-4">
        <FormField label={t.invoices.item} required>
          <Select name="itemId" defaultValue="" required>
            <option value="" disabled>
              {t.common.search}...
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nameAr} ({i.sku})
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.inventory.location} required>
            <Select name="locationId" defaultValue={locations[0]?.id} required>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.common.quantity} required error={state.fieldErrors?.quantity}>
            <Input
              name="quantity"
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0.001"
              required
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.damages.type} required>
            <Select name="type" defaultValue={DamageType.DAMAGED}>
              {Object.values(DamageType).map((type) => (
                <option key={type} value={type}>
                  {t.damages.types[type]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.common.date} required>
            <Input name="date" type="date" defaultValue={toDateInputValue()} required />
          </FormField>
        </div>
        <FormField label={t.common.reason} required>
          <Textarea name="reason" required maxLength={500} />
        </FormField>
        <FormField label={t.common.attachments} hint={t.damages.photoHint}>
          <Input name="attachments" type="file" accept="image/*" capture="environment" multiple />
        </FormField>
        <FormField label={t.common.notes}>
          <Textarea name="notes" />
        </FormField>
      </Card>

      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t.common.loading : t.common.submit}
      </Button>
    </form>
  );
}
