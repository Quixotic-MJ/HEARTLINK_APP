/**
 * Daily reminders: save them and schedule them on the phone.
 * Used by first-run setup (app/(baseline)/reminders.tsx) and Settings (app/(home)/(settings)/daily-reminders.tsx).
 *
 * Morning, activity and evening are saved to the account. The account has no place for the medicine
 * reminder yet, so it is kept on this phone, per account.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestNotificationPermissions, scheduleDailyReminder, cancelReminder } from "../utils/notifications";
import { apiFetch } from "../lib/api";

export interface Reminder {
  enabled: boolean;
  /** "HH:MM", 24-hour */
  time: string;
}

export interface Reminders {
  morning: Reminder;
  activity: Reminder;
  evening: Reminder;
  medicine: Reminder;
}

export const DEFAULT_REMINDERS: Reminders = {
  morning: { enabled: true, time: "07:30" },
  activity: { enabled: true, time: "17:00" },
  evening: { enabled: false, time: "20:00" },
  medicine: { enabled: false, time: "08:00" },
};

const NOTIFICATION_COPY: Record<keyof Reminders, { id: string; title: string; body: string }> = {
  morning: { id: "morning_reminder", title: "Morning Check-in", body: "Start your day with a HeartLink check-in." },
  evening: { id: "evening_reminder", title: "Evening Wrap-up", body: "Review your day before bedtime." },
  activity: { id: "activity_reminder", title: "Activity Goal", body: "Get a reminder to stay on track with your movement goal." },
  medicine: { id: "medicine_reminder", title: "Take your medicines", body: "Time to take your medicines as prescribed." },
};

const medicineKey = (userId: string) => `@medicine_reminder_${userId}`;

/** The account's reminders, or null if they couldn't be loaded. */
export async function loadReminders(userId: string, token: string): Promise<Reminders | null> {
  const response = await apiFetch(`/api/users/${userId}/reminders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data) return null;
  let medicine = DEFAULT_REMINDERS.medicine;
  try {
    const saved = await AsyncStorage.getItem(medicineKey(userId));
    if (saved) medicine = JSON.parse(saved);
  } catch {
    // Keep the default.
  }
  return {
    morning: data.morning || { enabled: false, time: "08:00" },
    evening: data.evening || { enabled: false, time: "20:00" },
    activity: data.activity || { enabled: false, time: "17:00" },
    medicine,
  };
}

/** Saves reminders to the account (the medicine one on the phone). Throws if the server refuses. */
export async function saveReminders(userId: string, token: string, reminders: Reminders): Promise<void> {
  const { medicine, ...account } = reminders;
  await AsyncStorage.setItem(medicineKey(userId), JSON.stringify(medicine));
  const response = await apiFetch(`/api/users/${userId}/reminders`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(account),
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
