"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Textarea } from "@/components/ui";

export type SupplierFormInitial = {
  nameAr: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber: string;
  address: string;
  categories: string;
  paymentTerms: string;
  notes: string;
};

export function SupplierForm({
  action,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: SupplierFormInitial;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <Card className="space-y-4">
        <FormField label={t.suppliers.name} required error={state.fieldErrors?.nameAr}>
          <Input name="nameAr" defaultValue={initial?.nameAr} required />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.suppliers.contactPerson} error={state.fieldErrors?.contactPerson}>
            <Input name="contactPerson" defaultValue={initial?.contactPerson} />
          </FormField>
          <FormField label={t.users.phone} error={state.fieldErrors?.phone}>
            <Input name="phone" type="tel" dir="ltr" defaultValue={initial?.phone} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.auth.email} error={state.fieldErrors?.email}>
            <Input name="email" type="email" dir="ltr" defaultValue={initial?.email} />
          </FormField>
          <FormField label={t.suppliers.taxNumber} error={state.fieldErrors?.taxNumber}>
            <Input name="taxNumber" dir="ltr" defaultValue={initial?.taxNumber} />
          </FormField>
        </div>
        <FormField label={t.suppliers.address} error={state.fieldErrors?.address}>
          <Input name="address" defaultValue={initial?.address} />
        </FormField>
        <FormField label={t.suppliers.categories} error={state.fieldErrors?.categories}>
          <Input name="categories" defaultValue={initial?.categories} />
        </FormField>
        <FormField label={t.suppliers.paymentTerms} error={state.fieldErrors?.paymentTerms}>
          <Input name="paymentTerms" defaultValue={initial?.paymentTerms} />
        </FormField>
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
