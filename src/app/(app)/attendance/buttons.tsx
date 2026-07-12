"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AttendanceEventType } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { Button, Card } from "@/components/ui";
import { recordAttendance } from "./actions";

const LABELS: Record<AttendanceEventType, string> = {
  CHECK_IN: t.attendance.checkIn,
  CHECK_OUT: t.attendance.checkOut,
  BREAK_START: t.attendance.breakStart,
  BREAK_END: t.attendance.breakEnd,
};

const ICONS: Record<AttendanceEventType, string> = {
  CHECK_IN: "🟢",
  CHECK_OUT: "🔴",
  BREAK_START: "☕",
  BREAK_END: "▶️",
};

export function AttendanceButtons({ allowed }: { allowed: AttendanceEventType[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allowed.map((type) => (
          <Button
            key={type}
            disabled={pending}
            className="!py-6 text-lg"
            variant={type === AttendanceEventType.CHECK_OUT ? "danger" : "primary"}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await recordAttendance(type);
                if (result.error) setError(result.error);
                else router.refresh();
              })
            }
          >
            <span aria-hidden>{ICONS[type]}</span> {LABELS[type]}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </Card>
  );
}
