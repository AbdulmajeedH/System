"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";
import { Button, FormField, Input } from "@/components/ui";
import { confirmStandaloneTransfer } from "./actions";

export function ConfirmTransferPanel({ transferId }: { transferId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    confirmStandaloneTransfer.bind(null, transferId),
    {},
  );

  return (
    <form action={formAction} className="space-y-2 border-t border-border pt-3">
      <FormField label={t.transfers.deliveryEvidence}>
        <Input name="attachments" type="file" accept="image/*,application/pdf" multiple />
      </FormField>
      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full !py-2 text-sm">
        {pending ? t.common.loading : t.transfers.confirmReceive}
      </Button>
    </form>
  );
}
