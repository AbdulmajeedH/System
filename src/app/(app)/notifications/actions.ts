"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { actionUser } from "@/lib/auth/guards";
import { NOTIFICATION_TYPES } from "@/lib/services/notifications";
import type { FormState } from "@/lib/utils/action-state";

export async function markNotificationRead(notificationId: string): Promise<FormState> {
  const user = await actionUser();
  // updateMany so a crafted id can never touch another user's row.
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await actionUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
}

export async function saveNotificationPreferences(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await actionUser();

  for (const type of NOTIFICATION_TYPES) {
    const enabled = formData.get(`pref_${type}`) === "on";
    await prisma.notificationPreference.upsert({
      where: { userId_type: { userId: user.id, type } },
      create: { userId: user.id, type, enabled },
      update: { enabled },
    });
  }

  revalidatePath("/notifications/preferences");
  return { success: true };
}
