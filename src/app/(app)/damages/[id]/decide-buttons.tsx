"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Textarea } from "@/components/ui";
import { decideDamage } from "../actions";

export function DecideDamageButtons({ damageId }: { damageId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approveAction, approvePending] = useActionState<FormState, FormData>(
    decideDamage.bind(null, damageId, "APPROVED"),
    {},
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<FormState, FormData>(
    decideDamage.bind(null, damageId, "REJECTED"),
    {},
  );
  const pending = approvePending || rejectPending;
  const error = approveState.error || rejectState.error;

  return (
    <Card className="space-y-3">
      <div className="flex gap-3">
        <form action={approveAction} className="flex-1">
          <Button type="submit" disabled={pending} className="w-full">
            {t.damages.approve}
          </Button>
        </form>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          className="flex-1"
          onClick={() => setRejecting((v) => !v)}
        >
          {t.damages.reject}
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
            {t.damages.reject}
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </Card>
  );
}
