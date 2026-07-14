"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { markNotificationRead } from "./actions";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="mark read"
      className="shrink-0 rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-primary-soft hover:text-primary disabled:opacity-50"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startTransition(async () => {
          await markNotificationRead(notificationId);
          router.refresh();
        });
      }}
    >
      <Check className="size-4" aria-hidden />
    </button>
  );
}
