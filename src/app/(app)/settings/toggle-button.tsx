"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n/ar";
import type { FormState } from "@/lib/utils/action-state";

/** Small activate/deactivate toggle used across settings lists. */
export function ToggleActiveButton({
  id,
  isActive,
  action,
}: {
  id: string;
  isActive: boolean;
  action: (id: string, isActive: boolean) => Promise<FormState>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <button
        type="button"
        disabled={pending}
        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:opacity-50 ${
          isActive
            ? "text-danger hover:bg-danger-soft"
            : "text-success hover:bg-green-50"
        }`}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await action(id, !isActive);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? t.common.loading : isActive ? t.common.deactivate : t.common.activate}
      </button>
    </span>
  );
}
