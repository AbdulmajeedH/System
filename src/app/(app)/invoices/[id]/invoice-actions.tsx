"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Textarea } from "@/components/ui";
import { decideInvoice, receiveInvoice } from "../actions";

export function DecideInvoiceButtons({ invoiceId }: { invoiceId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approveAction, approvePending] = useActionState<FormState, FormData>(
    decideInvoice.bind(null, invoiceId, "APPROVED"),
    {},
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<FormState, FormData>(
    decideInvoice.bind(null, invoiceId, "REJECTED"),
    {},
  );
  const pending = approvePending || rejectPending;
  const error = approveState.error || rejectState.error;

  return (
    <Card className="space-y-3">
      <div className="flex gap-3">
        <form action={approveAction} className="flex-1">
          <Button type="submit" disabled={pending} className="w-full">
            {t.invoices.approve}
          </Button>
        </form>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          className="flex-1"
          onClick={() => setRejecting((v) => !v)}
        >
          {t.invoices.reject}
        </Button>
      </div>
      {rejecting ? (
        <form action={rejectAction} className="space-y-3">
          <FormField
            label={t.income.rejectionReason}
            required
            error={rejectState.fieldErrors?.comment}
          >
            <Textarea name="comment" required />
          </FormField>
          <Button type="submit" variant="danger" disabled={pending}>
            {t.invoices.reject}
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </Card>
  );
}

export function ReceiveInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="space-y-2">
      <p className="text-sm text-muted">{t.invoices.receiveConfirm}</p>
      <Button
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            const result = await receiveInvoice(invoiceId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? t.common.loading : t.invoices.receive}
      </Button>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </Card>
  );
}
