"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Badge, Button, Card, FormField, Input } from "@/components/ui";
import { saveExpenseCategory, setExpenseCategoryActive } from "../actions";
import { ToggleActiveButton } from "../toggle-button";

type CategoryRow = { id: string; nameAr: string; isActive: boolean; expenseCount: number };

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    (prev, formData) => saveExpenseCategory(editing?.id ?? null, prev, formData),
    {},
  );

  return (
    <div className="space-y-4">
      <Card>
        <ul className="divide-y divide-border">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{category.nameAr}</span>
                <Badge tone="gray">{category.expenseCount}</Badge>
                {!category.isActive ? <Badge tone="red">{t.common.inactive}</Badge> : null}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft"
                  onClick={() => setEditing(category)}
                >
                  {t.common.edit}
                </button>
                <ToggleActiveButton
                  id={category.id}
                  isActive={category.isActive}
                  action={setExpenseCategoryActive}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <form action={formAction} className="space-y-4" key={editing?.id ?? "new"}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              {editing ? `${t.common.edit}: ${editing.nameAr}` : t.settings.categoryNew}
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
          <FormField label={t.settings.categoryName} required error={state.fieldErrors?.nameAr}>
            <Input name="nameAr" defaultValue={editing?.nameAr} required />
          </FormField>
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
