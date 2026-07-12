"use server";

import { revalidatePath } from "next/cache";
import { prisma, withSerializableTx } from "@/lib/db";
import { AttendanceEventType } from "@/generated/prisma/enums";
import { actionPermission } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/auth/session";
import { audit } from "@/lib/services/audit";
import { allowedNextEvents } from "@/lib/services/attendance";
import { unknownError, type FormState } from "@/lib/utils/action-state";
import { t } from "@/lib/i18n/ar";

export async function recordAttendance(type: AttendanceEventType): Promise<FormState> {
  const user = await actionPermission("attendance.own");
  if (!Object.values(AttendanceEventType).includes(type)) return unknownError();

  const { userAgent } = await requestMeta();

  try {
    await withSerializableTx(async (tx) => {
      const lastEvent = await tx.attendanceEvent.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: "desc" },
      });
      if (!allowedNextEvents(lastEvent?.type ?? null).includes(type)) {
        throw new Error("invalid-transition");
      }
      await tx.attendanceEvent.create({
        data: {
          userId: user.id,
          type,
          departmentId: user.departmentId,
          deviceInfo: userAgent?.slice(0, 250) ?? null,
        },
      });
    });
  } catch (error) {
    if ((error as Error).message === "invalid-transition") {
      return { error: t.attendance.invalidTransition };
    }
    return unknownError();
  }

  await audit({
    userId: user.id,
    action: `attendance.${type.toLowerCase()}`,
    entityType: "AttendanceEvent",
  });

  revalidatePath("/attendance");
  return { success: true };
}
