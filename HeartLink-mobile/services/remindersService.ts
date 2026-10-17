/**
 * Daily reminders: save to the backend and schedule them on the phone.
 * Same API and notification helpers as app/(home)/(settings)/daily-reminders.tsx.
 */
import { requestNotificationPermissions, scheduleDailyReminder, cancelReminder } from "../utils/notifications";

export interface Reminder {
  enabled: boolean;
  /** "HH:MM", 24-hour */
  time: string;
}

export interface Reminders {
  morning: Reminder;
  activity: Reminder;
  evening: Reminder;
}

export const DEFAULT_REMINDERS: Reminders = {
  morning: { enabled: true, time: "07:30" },
  activity: { enabled: true, time: "17:00" },
  evening: { enabled: false, time: "20:00" },
};

const NOTIFICATION_COPY: Record<keyof Reminders, { id: string; title: string; body: string }> = {
  morning: { id: "morning_reminder", title: "Morning Check-in", body: "Start your day with a HeartLink check-in." },
  evening: { id: "evening_reminder", title: "Evening Wrap-up", body: "Review your day before bedtime." },
  activity: { id: "activity_reminder", title: "Activity Goal", body: "Get a reminder to stay on track with your movement goal." },
};

/** Saves reminders to the account. Throws if the server refuses. */
export async function saveReminders(userId: string, token: string, reminders: Reminders): Promise<void> {
  const base_url = process.env.EXPO_PUBLIC_API_URL;
  const response = await fetch(`${base_url}/api/users/${userId}/reminders`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(reminders),
  });
  if (!response.ok) {
    throw new Error("Couldn't save your reminders. You can set them later in Settings.");
  }
}

/**
 * Asks for notification permission (the phone's own prompt) and schedules the enabled reminders.
 * Returns false if permission was refused.
 */
export async function scheduleReminders(reminders: Reminders): Promise<boolean> {
  const allowed = await requestNotificationPermissions();
  if (!allowed) return false;
  for (const key of Object.keys(NOTIFICATION_COPY) as (keyof Reminders)[]) {
    const copy = NOTIFICATION_COPY[key];
    if (reminders[key].enabled) {
      await scheduleDailyReminder(copy.id, copy.title, copy.body, reminders[key].time);
    } else {
      await cancelReminder(copy.id);
    }
  }
  return true;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
