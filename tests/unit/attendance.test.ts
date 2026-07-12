import { describe, expect, it } from "vitest";
import { AttendanceEventType } from "../../src/generated/prisma/enums";
import {
  allowedNextEvents,
  warningsForDay,
  type AttendanceSettings,
} from "../../src/lib/services/attendance";

const { CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END } = AttendanceEventType;

describe("allowedNextEvents", () => {
  it("only allows check-in when idle or checked out", () => {
    expect(allowedNextEvents(null)).toEqual([CHECK_IN]);
    expect(allowedNextEvents(CHECK_OUT)).toEqual([CHECK_IN]);
  });

  it("allows check-out or break after check-in / break-end", () => {
    expect(allowedNextEvents(CHECK_IN)).toEqual([CHECK_OUT, BREAK_START]);
    expect(allowedNextEvents(BREAK_END)).toEqual([CHECK_OUT, BREAK_START]);
  });

  it("only allows ending an open break", () => {
    expect(allowedNextEvents(BREAK_START)).toEqual([BREAK_END]);
  });
});

const settings: AttendanceSettings = {
  workdayStart: "08:00",
  lateAfterMinutes: 15,
  maxBreakMinutes: 60,
};

function at(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe("warningsForDay", () => {
  it("flags late check-in", () => {
    expect(
      warningsForDay([{ type: CHECK_IN, timestamp: at(8, 30) }], settings, false),
    ).toContain("late");
    expect(
      warningsForDay([{ type: CHECK_IN, timestamp: at(8, 10) }], settings, false),
    ).not.toContain("late");
  });

  it("flags breaks longer than the limit", () => {
    const events = [
      { type: CHECK_IN, timestamp: at(8, 0) },
      { type: BREAK_START, timestamp: at(12, 0) },
      { type: BREAK_END, timestamp: at(13, 30) },
    ];
    expect(warningsForDay(events, settings, false)).toContain("longBreak");
  });

  it("flags missing checkout only for ended days", () => {
    const events = [{ type: CHECK_IN, timestamp: at(8, 0) }];
    expect(warningsForDay(events, settings, true)).toContain("missingCheckout");
    expect(warningsForDay(events, settings, false)).not.toContain("missingCheckout");
  });
});
