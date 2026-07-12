"use client";

import { useActionState, useMemo, useState } from "react";
import { ShiftType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatMoney, toDateInputValue } from "@/lib/utils/format";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";

export type IncomeFormInitial = {
  date: string;
  shiftType: ShiftType;
  departmentId: string;
  cashIncome: string;
  cardIncome: string;
  bankTransferIncome: string;
  deliveryAppsIncome: string;
  otherIncome: string;
  cashExpenses: string;
  cashRefunds: string;
  actualDelivered: string;
  differenceReason: string;
  notes: string;
  productCounts: Record<string, string>;
};

export type ProductOption = { id: string; nameAr: string; departmentId: string };
export type DepartmentOption = { id: string; nameAr: string };

const AMOUNT_FIELDS = [
  "cashIncome",
  "cardIncome",
  "bankTransferIncome",
  "deliveryAppsIncome",
  "otherIncome",
  "cashExpenses",
  "cashRefunds",
  "actualDelivered",
] as const;

type AmountField = (typeof AMOUNT_FIELDS)[number];

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function IncomeForm({
  action,
  departments,
  lockedDepartmentId,
  products,
  allowException,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  departments: DepartmentOption[];
  lockedDepartmentId: string | null;
  products: ProductOption[];
  allowException: boolean;
  initial?: IncomeFormInitial;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [departmentId, setDepartmentId] = useState(
    initial?.departmentId ?? lockedDepartmentId ?? departments[0]?.id ?? "",
  );
  const [amounts, setAmounts] = useState<Record<AmountField, string>>({
    cashIncome: initial?.cashIncome ?? "",
    cardIncome: initial?.cardIncome ?? "",
    bankTransferIncome: initial?.bankTransferIncome ?? "",
    deliveryAppsIncome: initial?.deliveryAppsIncome ?? "",
    otherIncome: initial?.otherIncome ?? "",
    cashExpenses: initial?.cashExpenses ?? "",
    cashRefunds: initial?.cashRefunds ?? "",
    actualDelivered: initial?.actualDelivered ?? "",
  });

  const totals = useMemo(() => {
    const totalIncome =
      num(amounts.cashIncome) +
      num(amounts.cardIncome) +
      num(amounts.bankTransferIncome) +
      num(amounts.deliveryAppsIncome) +
      num(amounts.otherIncome);
    const expectedCash = num(amounts.cashIncome) - num(amounts.cashExpenses) - num(amounts.cashRefunds);
    return {
      totalIncome,
      netIncome: totalIncome - num(amounts.cashExpenses),
      expectedCash,
      cashDifference: num(amounts.actualDelivered) - expectedCash,
    };
  }, [amounts]);

  const hasDifference = Math.abs(totals.cashDifference) >= 0.005;
  const departmentProducts = products.filter((p) => p.departmentId === departmentId);

  const amountInput = (name: AmountField, label: string) => (
    <FormField key={name} label={label} error={state.fieldErrors?.[name]}>
      <Input
        name={name}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={amounts[name]}
        onChange={(e) => setAmounts((prev) => ({ ...prev, [name]: e.target.value }))}
      />
    </FormField>
  );

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t.common.date} required error={state.fieldErrors?.date}>
            <Input name="date" type="date" defaultValue={initial?.date ?? toDateInputValue()} required />
          </FormField>
          <FormField label={t.income.shift} required error={state.fieldErrors?.shiftType}>
            <Select name="shiftType" defaultValue={initial?.shiftType ?? ShiftType.FULL_DAY}>
              {Object.values(ShiftType).map((s) => (
                <option key={s} value={s}>
                  {t.shifts[s]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        {lockedDepartmentId ? (
          <input type="hidden" name="departmentId" value={lockedDepartmentId} />
        ) : (
          <FormField label={t.common.department} required error={state.fieldErrors?.departmentId}>
            <Select
              name="departmentId"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAr}
                </option>
              ))}
            </Select>
          </FormField>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">{t.income.incomeSection}</h2>
        {amountInput("cashIncome", t.income.cashIncome)}
        {amountInput("cardIncome", t.income.cardIncome)}
        {amountInput("bankTransferIncome", t.income.bankTransferIncome)}
        {amountInput("deliveryAppsIncome", t.income.deliveryAppsIncome)}
        {amountInput("otherIncome", t.income.otherIncome)}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">{t.income.cashSection}</h2>
        {amountInput("cashExpenses", t.income.cashExpenses)}
        {amountInput("cashRefunds", t.income.cashRefunds)}
        {amountInput("actualDelivered", t.income.actualDelivered)}
      </Card>

      {/* Live summary */}
      <Card className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t.income.totalIncome}</span>
          <span className="font-bold dir-ltr">{formatMoney(totals.totalIncome)} {t.app.currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t.income.netIncome}</span>
          <span className="font-bold dir-ltr">{formatMoney(totals.netIncome)} {t.app.currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t.income.expectedCash}</span>
          <span className="font-bold dir-ltr">{formatMoney(totals.expectedCash)} {t.app.currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t.income.cashDifference}</span>
          <span className={`font-bold dir-ltr ${hasDifference ? "text-danger" : "text-success"}`}>
            {formatMoney(totals.cashDifference)} {t.app.currency}
          </span>
        </div>
        {hasDifference ? (
          <FormField
            label={t.income.differenceReason}
            required
            error={state.fieldErrors?.differenceReason}
          >
            <Textarea
              name="differenceReason"
              defaultValue={initial?.differenceReason}
              placeholder={t.income.differenceReason}
            />
          </FormField>
        ) : null}
      </Card>

      {departmentProducts.length > 0 ? (
        <Card className="space-y-3">
          <h2 className="font-bold">{t.income.importantProducts}</h2>
          {departmentProducts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{p.nameAr}</span>
              <Input
                name={`product_${p.id}`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="0"
                className="w-28"
                defaultValue={initial?.productCounts[p.id] ?? ""}
              />
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="space-y-4">
        <FormField label={t.common.attachments} hint={t.income.attachmentsHint}>
          <Input name="attachments" type="file" accept="image/*,application/pdf" multiple />
        </FormField>
        <FormField label={t.common.notes} error={state.fieldErrors?.notes}>
          <Textarea name="notes" defaultValue={initial?.notes} />
        </FormField>
        {allowException ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isException" value="true" className="size-4" />
            {t.income.exceptionLabel}
          </label>
        ) : null}
      </Card>

      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? t.common.loading : t.common.submit}
        </Button>
        <Button
          type="submit"
          name="asDraft"
          value="1"
          variant="secondary"
          disabled={pending}
          className="flex-1"
        >
          {t.common.saveDraft}
        </Button>
      </div>
    </form>
  );
}
