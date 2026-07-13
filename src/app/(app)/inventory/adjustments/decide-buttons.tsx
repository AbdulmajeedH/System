"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, FormField, Textarea } from "@/components/ui";
import { decideAdjustment } from "./actions";

export function DecideAdjustmentButtons({ adjustmentId }: { adjustmentId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approveAction, approvePending] = useActionState<FormState, FormData>(
    decideAdjustment.bind(null, adjustmentId, "APPROVED"),
    {},
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<FormState, FormData>(
    decideAdjustment.bind(null, adjustmentId, "REJECTED"),
    {},
  );
  const pending = approvePending || rejectPending;
  const error = approveState.error || rejectState.error;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex gap-2">
        <form action={approveAction} className="flex-1">
          <Button type="submit" disabled={pending} className="w-full !py-2 text-xs">
            {t.adjustments.approveAndPost}
          </Button>
        </form>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          className="flex-1 !py-2 text-xs"
          onClick={() => setRejecting((v) => !v)}
        >
          {t.stockCounts.reject}
        </Button>
      </div>
      {rejecting ? (
        <form action={rejectAction} className="space-y-2">
          <FormField
            label={t.income.rejectionReason}
            required
            error={rejectState.fieldErrors?.comment}
          >
            <Textarea name="comment" required />
          </FormField>
          <Button type="submit" variant="danger" disabled={pending} className="!py-2 text-xs">
            {t.stockCounts.reject}
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
