"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Badge, Button, Card, FormField, Input, Select } from "@/components/ui";
import { saveImportantProduct, setImportantProductActive } from "../actions";
import { ToggleActiveButton } from "../toggle-button";

type ProductRow = {
  id: string;
  departmentId: string;
  nameAr: string;
  sortOrder: number;
  isActive: boolean;
};

export function ProductsManager({
  departments,
  products,
}: {
  departments: Array<{ id: string; nameAr: string }>;
  products: ProductRow[];
}) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    (prev, formData) => saveImportantProduct(editing?.id ?? null, prev, formData),
    {},
  );

  const rows = products
    .filter((p) => p.departmentId === departmentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      {departments.length > 1 ? (
        <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setEditing(null); }}>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nameAr}
            </option>
          ))}
        </Select>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone="gray">{product.sortOrder}</Badge>
                  <span className="font-medium">{product.nameAr}</span>
                  {!product.isActive ? <Badge tone="red">{t.common.inactive}</Badge> : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft"
                    onClick={() => setEditing(product)}
                  >
                    {t.common.edit}
                  </button>
                  <ToggleActiveButton
                    id={product.id}
                    isActive={product.isActive}
                    action={setImportantProductActive}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <form action={formAction} className="space-y-4" key={editing?.id ?? "new"}>
          <input type="hidden" name="departmentId" value={editing?.departmentId ?? departmentId} />
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              {editing ? `${t.common.edit}: ${editing.nameAr}` : t.settings.productNew}
            </h2>
            {editing ? (
              <button
                type="button"
                className="text-xs font-semibold text-muted hover:text-foreground"
                onClick={() => setEditing(null)}
              >
                {t.common.cancel}
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <FormField label={t.settings.productName} required error={state.fieldErrors?.nameAr}>
              <Input name="nameAr" defaultValue={editing?.nameAr} required />
            </FormField>
            <FormField label={t.settings.sortOrder}>
              <Input
                name="sortOrder"
                type="number"
                min="0"
                max="99"
                defaultValue={editing?.sortOrder ?? rows.length}
              />
            </FormField>
          </div>
          {state.success ? <p className="text-sm text-success">{t.common.savedSuccessfully}</p> : null}
          {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? t.common.loading : t.common.save}
          </Button>
        </form>
      </Card>
    </div>
  );
}
