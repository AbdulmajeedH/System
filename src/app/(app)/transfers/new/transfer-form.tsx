"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";
import { createStandaloneTransfer } from "../actions";

type Line = { itemId: string; quantity: string };

export function TransferForm({
  items,
  locations,
  lockedFrom,
  lockedTo,
}: {
  items: Array<{ id: string; nameAr: string; sku: string }>;
  locations: Array<{ id: string; nameAr: string }>;
  lockedFrom: string | null;
  lockedTo: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createStandaloneTransfer,
    {},
  );
  const [lines, setLines] = useState<Line[]>([{ itemId: "", quantity: "1" }]);
  const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <input type="hidden" name="lines" value={JSON.stringify(validLines)} />
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {lockedFrom ? (
            <input type="hidden" name="fromLocationId" value={lockedFrom} />
          ) : (
            <FormField label={t.transfers.from} required>
              <Select name="fromLocationId" defaultValue={locations[0]?.id}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nameAr}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {lockedTo ? (
            <input type="hidden" name="toLocationId" value={lockedTo} />
          ) : (
            <FormField label={t.transfers.to} required>
              <Select name="toLocationId" defaultValue={locations[1]?.id ?? locations[0]?.id}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nameAr}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">{t.inventory.items}</h2>
        {lines.map((line, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                value={line.itemId}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === index ? { ...l, itemId: e.target.value } : l)),
                  )
                }
              >
                <option value="" disabled>
                  {t.common.search}...
                </option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nameAr} ({item.sku})
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-28">
              <Input
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0.001"
                value={line.quantity}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)),
                  )
                }
              />
            </div>
            {lines.length > 1 ? (
              <button
                type="button"
                className="text-danger text-sm pb-3"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setLines((prev) => [...prev, { itemId: "", quantity: "1" }])}
        >
          + {t.invoices.addItem}
        </Button>
      </Card>

      <Card className="space-y-4">
        <FormField label={t.transfers.deliveryEvidence}>
          <Input name="attachments" type="file" accept="image/*,application/pdf" multiple />
        </FormField>
        <FormField label={t.common.notes}>
          <Textarea name="notes" />
        </FormField>
      </Card>

      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending || validLines.length === 0} className="w-full sm:w-auto">
        {pending ? t.common.loading : t.common.submit}
      </Button>
    </form>
  );
}
