// Pure attendance logic (unit-tested). Channel-agnostic: the web UI calls
// this today; Telegram/WhatsApp/QR channels can call the same functions
// later — they only need to supply userId, event type, and context.
import { AttendanceEventType } from "../../generated/prisma/enums";

export type AttendanceChannel = "WEB"; // future: "TELEGRAM" | "WHATSAPP" | "QR"

/**
 * State machine over the user's LAST event:
 *   (none | CHECK_OUT)        → CHECK_IN
 *   (CHECK_IN | BREAK_END)    → CHECK_OUT | BREAK_START
 *   BREAK_START               → BREAK_END
 * Repeats and out-of-order events are impossible by construction.
 */
export function allowedNextEvents(
  lastEvent: AttendanceEventType | null,
): AttendanceEventType[] {
  switch (lastEvent) {
    case null:
    case AttendanceEventType.CHECK_OUT:
      return [AttendanceEventType.CHECK_IN];
    case AttendanceEventType.CHECK_IN:
    case AttendanceEventType.BREAK_END:
      return [AttendanceEventType.CHECK_OUT, AttendanceEventType.BREAK_START];
    case AttendanceEventType.BREAK_START:
      return [AttendanceEventType.BREAK_END];
  }
}

export type AttendanceSettings = {
  workdayStart: string; // "08:00"
  lateAfterMinutes: number;
  maxBreakMinutes: number;
};

export type AttendanceWarning = "late" | "longBreak" | "missingCheckout";

/** Derives warnings for one user's events of a single day (sorted asc). */
export function warningsForDay(
  events: Array<{ type: AttendanceEventType; timestamp: Date }>,
  settings: AttendanceSettings,
  dayEnded: boolean,
): AttendanceWarning[] {
  const warnings: AttendanceWarning[] = [];
  const checkIn = events.find((e) => e.type === AttendanceEventType.CHECK_IN);

  if (checkIn) {
    const [h, m] = settings.workdayStart.split(":").map(Number);
    const threshold = new Date(checkIn.timestamp);
    threshold.setHours(h, m + settings.lateAfterMinutes, 0, 0);
    if (checkIn.timestamp > threshold) warnings.push("late");
  }

  // Long break: any BREAK_START → BREAK_END gap above the limit (or an
  // unclosed break older than the limit).
  let breakStart: Date | null = null;
  for (const event of events) {
    if (event.type === AttendanceEventType.BREAK_START) breakStart = event.timestamp;
    if (event.type === AttendanceEventType.BREAK_END && breakStart) {
      const minutes = (event.timestamp.getTime() - breakStart.getTime()) / 60000;
      if (minutes > settings.maxBreakMinutes) warnings.push("longBreak");
      breakStart = null;
    }
  }
  if (breakStart && (Date.now() - breakStart.getTime()) / 60000 > settings.maxBreakMinutes) {
    warnings.push("longBreak");
  }

  if (dayEnded && checkIn && !events.some((e) => e.type === AttendanceEventType.CHECK_OUT)) {
    warnings.push("missingCheckout");
  }

  return [...new Set(warnings)];
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  workdayStart: "08:00",
  lateAfterMinutes: 15,
  maxBreakMinutes: 60,
};

export function parseAttendanceSettings(
  raw: Record<string, string | undefined>,
): AttendanceSettings {
  return {
    workdayStart: raw["attendance.workday_start"] ?? DEFAULT_ATTENDANCE_SETTINGS.workdayStart,
    lateAfterMinutes:
      Number(raw["attendance.late_after_minutes"]) || DEFAULT_ATTENDANCE_SETTINGS.lateAfterMinutes,
    maxBreakMinutes:
      Number(raw["attendance.max_break_minutes"]) || DEFAULT_ATTENDANCE_SETTINGS.maxBreakMinutes,
  };
}
