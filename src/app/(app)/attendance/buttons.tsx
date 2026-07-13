"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coffee, LogIn, LogOut, Play, type LucideIcon } from "lucide-react";
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

const ICONS: Record<AttendanceEventType, LucideIcon> = {
  CHECK_IN: LogIn,
  CHECK_OUT: LogOut,
  BREAK_START: Coffee,
  BREAK_END: Play,
};

export function AttendanceButtons({ allowed }: { allowed: AttendanceEventType[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allowed.map((type) => {
          const Icon = ICONS[type];
          return (
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
              <Icon className="size-5" aria-hidden /> {LABELS[type]}
            </Button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </Card>
  );
}
