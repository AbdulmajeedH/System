"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { PaymentMethod } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatMoney, toDateInputValue } from "@/lib/utils/format";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";
import { extractInvoiceFromImage } from "./extract-actions";

export type InvoiceItemOption = {
  id: string;
  nameAr: string;
  sku: string;
  currentPrice: string;
  purchaseUnitName: string;
};

export type InvoiceLineValue = {
  itemId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  tax: string;
  /** Raw name read from the invoice by AI; UI-only, stripped before submit. */
  rawName?: string;
};

export type InvoiceFormInitial = {
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentMethod: PaymentMethod;
  vat: string;
  notes: string;
  lines: InvoiceLineValue[];
};

const emptyLine = (): InvoiceLineValue => ({
  itemId: "",
  quantity: "1",
  unitPrice: "0",
  discount: "0",
  tax: "0",
});

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type ExtractionSummary = {
  supplierName: string | null;
  supplierMatched: boolean;
  matchedLines: number;
  totalLines: number;
};

export function InvoiceForm({
  action,
  suppliers,
  items,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  suppliers: Array<{ id: string; nameAr: string }>;
  items: InvoiceItemOption[];
  initial?: InvoiceFormInitial;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [lines, setLines] = useState<InvoiceLineValue[]>(
    initial?.lines.length ? initial.lines : [emptyLine()],
  );
  const [vat, setVat] = useState(initial?.vat ?? "0");
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoiceNumber ?? "");
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoiceDate ?? toDateInputValue());

  const [extracting, startExtracting] = useTransition();
  const [extractError, setExtractError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const subtotal = lines.reduce(
    (acc, l) => acc + num(l.quantity) * num(l.unitPrice) - num(l.discount),
    0,
  );
  const lineTaxes = lines.reduce((acc, l) => acc + num(l.tax), 0);
  const total = subtotal + lineTaxes + num(vat);

  const updateLine = (index: number, patch: Partial<InvoiceLineValue>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const validLines = lines.filter((l) => l.itemId && num(l.quantity) > 0);
  // Only the schema fields are submitted; UI-only fields (rawName) are stripped.
  const submitLines = validLines.map(({ itemId, quantity, unitPrice, discount, tax }) => ({
    itemId,
    quantity,
    unitPrice,
    discount,
    tax,
  }));

  const runExtraction = () => {
    if (!imageFile) {
      setExtractError(t.invoices.extract.noImage);
      return;
    }
    setExtractError(null);
    const formData = new FormData();
    formData.append("image", imageFile);
    startExtracting(async () => {
      const result = await extractInvoiceFromImage(formData);
      if (!result.ok) {
        setExtractError(result.error);
        setSummary(null);
        return;
      }
      const { draft } = result;
      if (draft.supplierId) setSupplierId(draft.supplierId);
      if (draft.invoiceNumber) setInvoiceNumber(draft.invoiceNumber);
      if (draft.invoiceDate) setInvoiceDate(draft.invoiceDate);
      setVat(draft.vat);
      setLines(
        draft.lines.length
          ? draft.lines.map((l) => ({
              itemId: l.itemId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: "0",
              tax: "0",
              rawName: l.rawName,
            }))
          : [emptyLine()],
      );
      setSummary({
        supplierName: draft.supplierName,
        supplierMatched: Boolean(draft.supplierId),
        matchedLines: draft.matchedLines,
        totalLines: draft.totalLines,
      });
    });
  };

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      <input type="hidden" name="lines" value={JSON.stringify(submitLines)} />

      <Card className="space-y-3 border-primary/40 bg-primary/5">
        <div>
          <h2 className="font-bold">{t.invoices.extract.title}</h2>
          <p className="text-sm text-muted">{t.invoices.extract.hint}</p>
        </div>
        <Input
          type="file"
          accept="image/*,application/pdf"
          disabled={extracting}
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={runExtraction} disabled={extracting}>
            {extracting ? t.invoices.extract.extracting : t.invoices.extract.button}
          </Button>
          {summary ? (
            <button
              type="button"
              className="text-muted text-xs"
              onClick={() => setSummary(null)}
            >
              {t.invoices.extract.dismiss}
            </button>
          ) : null}
        </div>
        {extractError ? (
          <p className="text-sm text-danger" role="alert">
            {extractError}
          </p>
        ) : null}
        {summary ? (
          <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 space-y-1">
            <p className="text-sm font-semibold text-warning">
              {t.invoices.extract.reviewNotice}
            </p>
            <p className="text-xs text-muted">
              {t.invoices.extract.matchedSummary
                .replace("{matched}", String(summary.matchedLines))
                .replace("{total}", String(summary.totalLines))}
            </p>
            {summary.supplierName && !summary.supplierMatched ? (
              <p className="text-xs text-muted">
                {t.invoices.extract.detected}: {summary.supplierName} —{" "}
                {t.invoices.extract.supplierUnmatched}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <FormField label={t.invoices.supplier} required error={state.fieldErrors?.supplierId}>
          <Select
            name="supplierId"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
          >
            <option value="" disabled>
              {t.common.search}...
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label={t.invoices.invoiceNumber}
            required
            error={state.fieldErrors?.invoiceNumber}
          >
            <Input
              name="invoiceNumber"
              dir="ltr"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t.invoices.invoiceDate} required error={state.fieldErrors?.invoiceDate}>
            <Input
              name="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </FormField>
        </div>
        <FormField label={t.expenses.paymentMethod} required>
          <Select name="paymentMethod" defaultValue={initial?.paymentMethod ?? PaymentMethod.CASH}>
            {Object.values(PaymentMethod).map((m) => (
              <option key={m} value={m}>
                {t.paymentMethods[m]}
              </option>
            ))}
          </Select>
        </FormField>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">{t.invoices.items}</h2>
        {state.fieldErrors?.lines ? (
          <p className="text-sm text-danger">{state.fieldErrors.lines}</p>
        ) : null}
        {lines.map((line, index) => {
          const item = itemById.get(line.itemId);
          const lineTotal = num(line.quantity) * num(line.unitPrice) - num(line.discount) + num(line.tax);
          const needsPick = !line.itemId && line.rawName;
          return (
            <div key={index} className="rounded-xl border border-border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-muted">#{index + 1}</span>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    className="text-danger text-sm"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                  >
                    {t.common.delete}
                  </button>
                ) : null}
              </div>
              {line.rawName ? (
                <p className="text-xs text-muted">
                  {t.invoices.extract.detected}: <span className="font-medium">{line.rawName}</span>
                </p>
              ) : null}
              <FormField
                label={t.invoices.item}
                required
                error={needsPick ? t.invoices.extract.unmatchedLine : undefined}
              >
                <Select
                  value={line.itemId}
                  onChange={(e) => {
                    const selected = itemById.get(e.target.value);
                    updateLine(index, {
                      itemId: e.target.value,
                      unitPrice:
                        num(line.unitPrice) > 0
                          ? line.unitPrice
                          : selected?.currentPrice ?? line.unitPrice,
                    });
                  }}
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
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label={`${t.common.quantity}${item ? ` (${item.purchaseUnitName})` : ""}`}
                  required
                >
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min="0.001"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  />
                </FormField>
                <FormField label={t.invoices.unitPrice} required>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.0001"
                    min="0"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t.invoices.discount}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={line.discount}
                    onChange={(e) => updateLine(index, { discount: e.target.value })}
                  />
                </FormField>
                <FormField label={t.invoices.tax}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={line.tax}
                    onChange={(e) => updateLine(index, { tax: e.target.value })}
                  />
                </FormField>
              </div>
              <p className="text-sm text-end">
                {t.invoices.lineTotal}:{" "}
                <span className="font-bold dir-ltr">{formatMoney(lineTotal)}</span> {t.app.currency}
              </p>
            </div>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setLines((prev) => [...prev, emptyLine()])}
        >
          + {t.invoices.addItem}
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t.invoices.subtotal}</span>
          <span className="font-bold dir-ltr">{formatMoney(subtotal)} {t.app.currency}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">{t.invoices.vat}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-primary text-xs font-medium"
              onClick={() => setVat((subtotal * 0.15).toFixed(2))}
            >
              {t.invoices.calcVat}
            </button>
            <Input
              name="vat"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="w-32"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-between border-t border-border pt-2">
          <span className="font-bold">{t.invoices.grandTotal}</span>
          <span className="font-bold dir-ltr">{formatMoney(total)} {t.app.currency}</span>
        </div>
        <FormField label={t.common.attachments} hint={t.invoices.attachmentsHint}>
          <Input name="attachments" type="file" accept="image/*,application/pdf" multiple />
        </FormField>
        <FormField label={t.common.notes} error={state.fieldErrors?.notes}>
          <Textarea name="notes" defaultValue={initial?.notes} />
        </FormField>
      </Card>

      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || validLines.length === 0} className="flex-1">
          {pending ? t.common.loading : t.invoices.submitForApproval}
        </Button>
        <Button
          type="submit"
          name="asDraft"
          value="1"
          variant="secondary"
          disabled={pending || validLines.length === 0}
          className="flex-1"
        >
          {t.common.saveDraft}
        </Button>
      </div>
    </form>
  );
}
