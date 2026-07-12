"use client";

import { useActionState, useState } from "react";
import { RequestPriority } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { toDateInputValue } from "@/lib/utils/format";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";
import { createStockRequest } from "./actions";

export type RequestItemOption = {
  id: string;
  nameAr: string;
  sku: string;
  baseUnitName: string;
};

type Line = { itemId: string; requestedQty: string };

export function RequestForm({
  items,
  departments,
  lockedDepartmentId,
}: {
  items: RequestItemOption[];
  departments: Array<{ id: string; nameAr: string }>;
  lockedDepartmentId: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createStockRequest, {});
  const [lines, setLines] = useState<Line[]>([{ itemId: "", requestedQty: "1" }]);

  const validLines = lines.filter((l) => l.itemId && Number(l.requestedQty) > 0);
  const itemById = new Map(items.map((i) => [i.id, i]));

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <input type="hidden" name="lines" value={JSON.stringify(validLines)} />

      <Card className="space-y-4">
        {lockedDepartmentId ? (
          <input type="hidden" name="departmentId" value={lockedDepartmentId} />
        ) : (
          <FormField label={t.common.department} required error={state.fieldErrors?.departmentId}>
            <Select name="departmentId" defaultValue={departments[0]?.id}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label={t.stockRequests.requiredDate}
            required
            error={state.fieldErrors?.requiredDate}
          >
            <Input name="requiredDate" type="date" defaultValue={toDateInputValue()} required />
          </FormField>
          <FormField label={t.stockRequests.priority} required>
            <Select name="priority" defaultValue={RequestPriority.NORMAL}>
              {Object.values(RequestPriority).map((p) => (
                <option key={p} value={p}>
                  {t.stockRequests.priorities[p]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">{t.inventory.items}</h2>
        {state.fieldErrors?.lines ? (
          <p className="text-sm text-danger">{state.fieldErrors.lines}</p>
        ) : null}
        {lines.map((line, index) => {
          const item = itemById.get(line.itemId);
          return (
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
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nameAr} ({i.sku})
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
                  value={line.requestedQty}
                  title={item ? item.baseUnitName : t.common.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === index ? { ...l, requestedQty: e.target.value } : l,
                      ),
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
          );
        })}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setLines((prev) => [...prev, { itemId: "", requestedQty: "1" }])}
        >
          + {t.invoices.addItem}
        </Button>
      </Card>

      <Card>
        <FormField label={t.common.notes} error={state.fieldErrors?.notes}>
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
