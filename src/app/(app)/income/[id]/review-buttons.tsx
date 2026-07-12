"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Textarea } from "@/components/ui";
import { reviewIncome } from "../actions";

export function ReviewButtons({
  submissionId,
  canMarkReviewed,
}: {
  submissionId: string;
  canMarkReviewed: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approveAction, approvePending] = useActionState<FormState, FormData>(
    reviewIncome.bind(null, submissionId, "APPROVED"),
    {},
  );
  const [reviewState, reviewAction, reviewPending] = useActionState<FormState, FormData>(
    reviewIncome.bind(null, submissionId, "REVIEWED"),
    {},
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<FormState, FormData>(
    reviewIncome.bind(null, submissionId, "REJECTED"),
    {},
  );

  const pending = approvePending || reviewPending || rejectPending;
  const error = approveState.error || reviewState.error || rejectState.error;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <form action={approveAction} className="flex-1 min-w-32">
          <Button type="submit" disabled={pending} className="w-full">
            {t.income.approve}
          </Button>
        </form>
        {canMarkReviewed ? (
          <form action={reviewAction} className="flex-1 min-w-32">
            <Button type="submit" variant="secondary" disabled={pending} className="w-full">
              {t.income.markReviewed}
            </Button>
          </form>
        ) : null}
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          className="flex-1 min-w-32"
          onClick={() => setRejecting((v) => !v)}
        >
          {t.income.reject}
        </Button>
      </div>
      {rejecting ? (
        <form action={rejectAction} className="space-y-3">
          <FormField
            label={t.income.rejectionReason}
            required
            error={rejectState.fieldErrors?.rejectionReason}
          >
            <Textarea name="rejectionReason" required />
          </FormField>
          <Button type="submit" variant="danger" disabled={pending}>
            {t.income.reject}
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </Card>
  );
}
