"use client";

import { useActionState, useState } from "react";
import { StockCountType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatMoney, toDateInputValue } from "@/lib/utils/format";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";
import { createStockCount } from "./actions";

export type CountSheetItem = {
  itemId: string;
  nameAr: string;
  sku: string;
  unitName: string;
  systemQty: string;
  averageCost: string;
};

export function CountForm({
  locations,
  itemsByLocation,
}: {
  locations: Array<{ id: string; nameAr: string }>;
  itemsByLocation: Record<string, CountSheetItem[]>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createStockCount, {});
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [actuals, setActuals] = useState<Record<string, string>>({});

  const items = itemsByLocation[locationId] ?? [];
  const totalDiffValue = items.reduce((acc, item) => {
    const actual = actuals[item.itemId];
    if (actual === undefined || actual === "") return acc;
    const diff = Number(actual) - Number(item.systemQty);
    return acc + Math.abs(diff * Number(item.averageCost));
  }, 0);

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      <Card className="space-y-4">
        <FormField label={t.inventory.location} required>
          <Select
            name="locationId"
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setActuals({});
            }}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nameAr}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.stockCounts.countDate} required>
            <Input name="countDate" type="date" defaultValue={toDateInputValue()} required />
          </FormField>
          <FormField label={t.stockCounts.countType} required>
            <Select name="countType" defaultValue={StockCountType.ADHOC}>
              {Object.values(StockCountType).map((type) => (
                <option key={type} value={type}>
                  {t.stockCounts.types[type]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold">{t.inventory.items}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted">{t.stockCounts.noItems}</p>
        ) : (
          items.map((item) => {
            const actual = actuals[item.itemId] ?? "";
            const diff = actual === "" ? null : Number(actual) - Number(item.systemQty);
            return (
              <div key={item.itemId} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-medium">{item.nameAr}</p>
                    <p className="text-xs text-muted">
                      {t.stockCounts.systemQty}:{" "}
                      <span className="dir-ltr">{item.systemQty}</span> {item.unitName}
                    </p>
                  </div>
                  <Input
                    name={`actual_${item.itemId}`}
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min="0"
                    placeholder={t.stockCounts.actualQty}
                    className="w-32"
                    value={actual}
                    onChange={(e) =>
                      setActuals((prev) => ({ ...prev, [item.itemId]: e.target.value }))
                    }
                  />
                </div>
                {diff !== null && Math.abs(diff) > 1e-9 ? (
                  <div className="space-y-2">
                    <p className={`text-xs font-bold ${diff < 0 ? "text-danger" : "text-warning"}`}>
                      {t.stockCounts.difference}: <span className="dir-ltr">{diff.toFixed(3)}</span>
                      {" · "}
                      {t.stockCounts.differenceValue}:{" "}
                      <span className="dir-ltr">
                        {formatMoney(diff * Number(item.averageCost))}
                      </span>{" "}
                      {t.app.currency}
                    </p>
                    <Input
                      name={`reason_${item.itemId}`}
                      placeholder={t.stockCounts.countReason}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t.stockCounts.totalDifferenceValue}</span>
          <span className="font-bold dir-ltr">
            {formatMoney(totalDiffValue)} {t.app.currency}
          </span>
        </div>
        <FormField label={t.common.notes}>
          <Textarea name="notes" />
        </FormField>
      </Card>

      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending || items.length === 0} className="w-full sm:w-auto">
        {pending ? t.common.loading : t.common.submit}
      </Button>
    </form>
  );
}
