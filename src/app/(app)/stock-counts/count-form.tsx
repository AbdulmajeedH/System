"use client";

import { useActionState, useMemo, useState } from "react";
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
  categoryName: string | null;
  systemQty: string;
  averageCost: string;
};

const UNCATEGORIZED = "__none__";

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
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [onlyCounted, setOnlyCounted] = useState(false);

  const items = itemsByLocation[locationId] ?? [];

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setOnlyCounted(false);
  };

  // Distinct categories present at this location, for the filter dropdown.
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      const key = item.categoryName ?? UNCATEGORIZED;
      if (!seen.has(key)) seen.set(key, item.categoryName ?? t.stockCounts.uncategorized);
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [items]);

  const query = search.trim().toLowerCase();
  const visibleItems = items.filter((item) => {
    if (category && (item.categoryName ?? UNCATEGORIZED) !== category) return false;
    if (onlyCounted && !(actuals[item.itemId]?.trim())) return false;
    if (query) {
      const hay = `${item.nameAr} ${item.sku}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  // Counts entered on items now hidden by the filter must still be submitted.
  const hiddenEntered = items.filter(
    (item) => !visibleItems.includes(item) && actuals[item.itemId]?.trim(),
  );

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
              setReasons({});
              resetFilters();
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
          <>
            {/* Filters: keep long count sheets manageable. */}
            <div className="space-y-2">
              <Input
                type="search"
                placeholder={t.stockCounts.searchItems}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  className="flex-1 min-w-40"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">{t.stockCounts.allCategories}</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-1.5 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={onlyCounted}
                    onChange={(e) => setOnlyCounted(e.target.checked)}
                  />
                  {t.stockCounts.onlyCounted}
                </label>
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>
                  {t.stockCounts.showingCount
                    .replace("{shown}", String(visibleItems.length))
                    .replace("{total}", String(items.length))}
                </span>
                {search || category || onlyCounted ? (
                  <button type="button" className="text-primary" onClick={resetFilters}>
                    {t.stockCounts.clearFilters}
                  </button>
                ) : null}
              </div>
            </div>

            {visibleItems.length === 0 ? (
              <p className="text-sm text-muted">{t.stockCounts.noMatch}</p>
            ) : (
              visibleItems.map((item) => {
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
                          {t.stockCounts.difference}:{" "}
                          <span className="dir-ltr">{diff.toFixed(3)}</span>
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
                          value={reasons[item.itemId] ?? ""}
                          onChange={(e) =>
                            setReasons((prev) => ({ ...prev, [item.itemId]: e.target.value }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}

            {/* Preserve counts entered before a filter hid their rows. */}
            {hiddenEntered.map((item) => (
              <div key={`hidden-${item.itemId}`}>
                <input type="hidden" name={`actual_${item.itemId}`} value={actuals[item.itemId]} />
                {reasons[item.itemId] ? (
                  <input type="hidden" name={`reason_${item.itemId}`} value={reasons[item.itemId]} />
                ) : null}
              </div>
            ))}
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t.stockCounts.totalDifferenceValue}</span>
          <span className="font-bold dir-ltr">
            {formatMoney(totalDiffValue)} {t.app.currency}
          </span>
        </div>
        <FormField label={t.common.attachments}>
          <Input name="attachments" type="file" accept="image/*,application/pdf" multiple />
        </FormField>
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
