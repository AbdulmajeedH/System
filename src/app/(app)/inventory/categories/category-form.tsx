"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select } from "@/components/ui";
import { createCategory } from "../actions";

export function CategoryForm({ parents }: { parents: Array<{ id: string; nameAr: string }> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createCategory, {});

  return (
    <Card>
      <form action={formAction} className="space-y-3">
        <h2 className="font-bold">{t.inventory.newCategory}</h2>
        <FormField label={t.inventory.nameAr} required error={state.fieldErrors?.nameAr}>
          <Input name="nameAr" required />
        </FormField>
        <FormField label={t.inventory.parentCategory} error={state.fieldErrors?.parentId}>
          <Select name="parentId" defaultValue="">
            <option value="">{t.common.none}</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
              </option>
            ))}
          </Select>
        </FormField>
        {state.success ? <p className="text-sm text-success">{t.common.savedSuccessfully}</p> : null}
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </form>
    </Card>
  );
}
