"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";

type Option = { id: string; nameAr: string };

export type ItemFormInitial = {
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode: string;
  categoryId: string;
  baseUnitId: string;
  purchaseUnitId: string;
  conversionFactor: string;
  currentPrice: string;
  minStock: string;
  reorderLevel: string;
  preferredSupplierId: string;
  storageLocation: string;
  expiryTracking: boolean;
  notes: string;
};

export function ItemForm({
  action,
  categories,
  units,
  suppliers,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Option[];
  units: Option[];
  suppliers: Option[];
  initial?: ItemFormInitial;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <Card className="space-y-4">
        <FormField label={t.inventory.nameAr} required error={state.fieldErrors?.nameAr}>
          <Input name="nameAr" defaultValue={initial?.nameAr} required />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.inventory.nameEn} error={state.fieldErrors?.nameEn}>
            <Input name="nameEn" dir="ltr" defaultValue={initial?.nameEn} />
          </FormField>
          <FormField label={t.inventory.sku} required error={state.fieldErrors?.sku}>
            <Input name="sku" dir="ltr" defaultValue={initial?.sku} required />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.inventory.barcode} error={state.fieldErrors?.barcode}>
            <Input name="barcode" dir="ltr" defaultValue={initial?.barcode} />
          </FormField>
          <FormField label={t.inventory.category} error={state.fieldErrors?.categoryId}>
            <Select name="categoryId" defaultValue={initial?.categoryId ?? ""}>
              <option value="">{t.common.none}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.inventory.baseUnit} required error={state.fieldErrors?.baseUnitId}>
            <Select name="baseUnitId" defaultValue={initial?.baseUnitId ?? units[0]?.id} required>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label={t.inventory.purchaseUnit}
            required
            error={state.fieldErrors?.purchaseUnitId}
          >
            <Select
              name="purchaseUnitId"
              defaultValue={initial?.purchaseUnitId ?? units[0]?.id}
              required
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField
          label={t.inventory.conversionFactor}
          required
          error={state.fieldErrors?.conversionFactor}
        >
          <Input
            name="conversionFactor"
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0.0001"
            defaultValue={initial?.conversionFactor ?? "1"}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.inventory.currentPrice} error={state.fieldErrors?.currentPrice}>
            <Input
              name="currentPrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={initial?.currentPrice ?? "0"}
            />
          </FormField>
          <FormField
            label={t.inventory.preferredSupplier}
            error={state.fieldErrors?.preferredSupplierId}
          >
            <Select name="preferredSupplierId" defaultValue={initial?.preferredSupplierId ?? ""}>
              <option value="">{t.common.none}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.inventory.minStock} error={state.fieldErrors?.minStock}>
            <Input
              name="minStock"
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              defaultValue={initial?.minStock ?? "0"}
            />
          </FormField>
          <FormField label={t.inventory.reorderLevel} error={state.fieldErrors?.reorderLevel}>
            <Input
              name="reorderLevel"
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              defaultValue={initial?.reorderLevel ?? "0"}
            />
          </FormField>
        </div>
        <FormField label={t.inventory.storageLocation} error={state.fieldErrors?.storageLocation}>
          <Input name="storageLocation" defaultValue={initial?.storageLocation} />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="expiryTracking"
            value="true"
            defaultChecked={initial?.expiryTracking}
            className="size-4"
          />
          {t.inventory.expiryTracking}
        </label>
        <FormField label={t.common.notes} error={state.fieldErrors?.notes}>
          <Textarea name="notes" defaultValue={initial?.notes} />
        </FormField>
      </Card>

      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t.common.loading : t.common.save}
      </Button>
    </form>
  );
}
