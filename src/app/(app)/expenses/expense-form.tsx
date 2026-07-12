"use client";

import { useActionState } from "react";
import { PaymentMethod } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { toDateInputValue } from "@/lib/utils/format";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";

type Option = { id: string; nameAr: string };

export function ExpenseForm({
  action,
  categories,
  suppliers,
  departments,
  lockedDepartmentId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Option[];
  suppliers: Option[];
  departments: Option[];
  lockedDepartmentId: string | null;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.common.date} required error={state.fieldErrors?.date}>
            <Input name="date" type="date" defaultValue={toDateInputValue()} required />
          </FormField>
          <FormField label={t.common.amount} required error={state.fieldErrors?.amount}>
            <Input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              required
            />
          </FormField>
        </div>
        {lockedDepartmentId ? (
          <input type="hidden" name="departmentId" value={lockedDepartmentId} />
        ) : (
          <FormField label={t.common.department} error={state.fieldErrors?.departmentId}>
            <Select name="departmentId" defaultValue="">
              <option value="">{t.common.none}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label={t.expenses.category} required error={state.fieldErrors?.categoryId}>
          <Select name="categoryId" required defaultValue="">
            <option value="" disabled>
              {t.common.search}...
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t.expenses.paymentMethod} required error={state.fieldErrors?.paymentMethod}>
          <Select name="paymentMethod" defaultValue={PaymentMethod.CASH}>
            {Object.values(PaymentMethod).map((m) => (
              <option key={m} value={m}>
                {t.paymentMethods[m]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t.expenses.description} required error={state.fieldErrors?.description}>
          <Textarea name="description" required maxLength={500} />
        </FormField>
        <FormField label={t.expenses.supplier} error={state.fieldErrors?.supplierId}>
          <Select name="supplierId" defaultValue="">
            <option value="">{t.common.none}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t.common.attachments} hint={t.expenses.receiptHint}>
          <Input name="attachments" type="file" accept="image/*,application/pdf" multiple />
        </FormField>
        <FormField label={t.common.notes} error={state.fieldErrors?.notes}>
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
