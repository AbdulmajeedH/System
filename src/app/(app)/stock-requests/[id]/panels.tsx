"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Textarea } from "@/components/ui";
import {
  advanceStockRequest,
  cancelStockRequest,
  confirmStockReceipt,
  decideStockRequest,
} from "../actions";

export type PanelItem = {
  itemId: string;
  nameAr: string;
  unitName: string;
  requestedQty: string;
  approvedQty: string | null;
  preparedQty: string | null;
  availableQty: string | null;
};

/** Warehouse decision panel for SUBMITTED requests. */
export function WarehouseDecisionPanel({
  requestId,
  items,
}: {
  requestId: string;
  items: PanelItem[];
}) {
  const [approveState, approveAction, approvePending] = useActionState<FormState, FormData>(
    decideStockRequest.bind(null, requestId, "APPROVE"),
    {},
  );
  const [partialState, partialAction, partialPending] = useActionState<FormState, FormData>(
    decideStockRequest.bind(null, requestId, "PARTIAL"),
    {},
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<FormState, FormData>(
    decideStockRequest.bind(null, requestId, "REJECT"),
    {},
  );
  const [rejecting, setRejecting] = useState(false);

  const pending = approvePending || partialPending || rejectPending;
  const error = approveState.error || partialState.error || rejectState.error;

  return (
    <Card className="space-y-4">
      <form action={partialAction} className="space-y-3">
        {items.map((item) => (
          <div key={item.itemId} className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">{item.nameAr}</p>
              <p className="text-xs text-muted">
                {t.stockRequests.requestedQty}: <span className="dir-ltr">{item.requestedQty}</span> {item.unitName}
                {item.availableQty !== null ? (
                  <>
                    {" · "}
                    {t.stockRequests.availableQty}: <span className="dir-ltr">{item.availableQty}</span>
                  </>
                ) : null}
              </p>
            </div>
            <Input
              name={`approved_${item.itemId}`}
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              defaultValue={item.requestedQty}
              className="w-28"
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" disabled={pending} className="flex-1">
            {t.stockRequests.approvePartial}
          </Button>
        </div>
      </form>
      <div className="flex gap-2">
        <form action={approveAction} className="flex-1">
          <Button type="submit" disabled={pending} className="w-full">
            {t.stockRequests.approveAll}
          </Button>
        </form>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          className="flex-1"
          onClick={() => setRejecting((v) => !v)}
        >
          {t.stockRequests.reject}
        </Button>
      </div>
      {rejecting ? (
        <form action={rejectAction} className="space-y-3">
          <FormField
            label={t.stockRequests.warehouseNotes}
            required
            error={rejectState.fieldErrors?.warehouseNotes}
          >
            <Textarea name="warehouseNotes" required />
          </FormField>
          <Button type="submit" variant="danger" disabled={pending}>
            {t.stockRequests.reject}
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </Card>
  );
}

/** Warehouse stage buttons: preparing → ready → delivered. */
export function StagePanel({
  requestId,
  stage,
}: {
  requestId: string;
  stage: "PREPARING" | "READY" | "DELIVERED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const labels = {
    PREPARING: t.stockRequests.startPreparing,
    READY: t.stockRequests.markReady,
    DELIVERED: t.stockRequests.markDelivered,
  } as const;

  return (
    <Card>
      <Button
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            const result = await advanceStockRequest(requestId, stage);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? t.common.loading : labels[stage]}
      </Button>
      {error ? <p className="text-sm text-danger mt-2" role="alert">{error}</p> : null}
    </Card>
  );
}

/** Department receipt confirmation for DELIVERED requests. */
export function ReceiptPanel({
  requestId,
  items,
}: {
  requestId: string;
  items: PanelItem[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    confirmStockReceipt.bind(null, requestId),
    {},
  );

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <h2 className="font-bold">{t.stockRequests.confirmReceipt}</h2>
        {items.map((item) => (
          <div key={item.itemId} className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-sm font-medium">
              {item.nameAr}{" "}
              <span className="text-xs text-muted">
                ({t.stockRequests.preparedQty}: <span className="dir-ltr">{item.preparedQty}</span> {item.unitName})
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t.stockRequests.receivedQty}>
                <Input
                  name={`received_${item.itemId}`}
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  defaultValue={item.preparedQty ?? "0"}
                />
              </FormField>
              <FormField label={t.stockRequests.damagedQty}>
                <Input
                  name={`damaged_${item.itemId}`}
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  defaultValue="0"
                />
              </FormField>
            </div>
          </div>
        ))}
        <FormField label={t.transfers.deliveryEvidence}>
          <Input name="attachments" type="file" accept="image/*,application/pdf" multiple />
        </FormField>
        <FormField label={t.stockRequests.receiptNotes}>
          <Textarea name="receiptNotes" />
        </FormField>
        {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.common.loading : t.stockRequests.confirmReceipt}
        </Button>
      </form>
    </Card>
  );
}

export function CancelPanel({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <Button
        variant="danger"
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            const result = await cancelStockRequest(requestId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? t.common.loading : t.stockRequests.cancel}
      </Button>
      {error ? <p className="text-sm text-danger mt-2" role="alert">{error}</p> : null}
    </Card>
  );
}
