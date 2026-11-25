/**
 * Daily reminders: save them and schedule them on the phone.
 * Used by first-run setup (app/(baseline)/reminders.tsx) and Settings (app/(home)/(settings)/daily-reminders.tsx).
 *
 * Morning, activity and evening are saved to the account. The account has no place for the bedtime reminder yet, so
 * it is kept on this phone, per account.
 *
 * 2026-11-24 (panel revision, HL-167 follow-up): the "Take your medicines" reminder was removed with the daily medicine
 * question. Phones that still had it scheduled get it cancelled (RETIRED_IDS).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cancelAllReminders,
  cancelReminder,
  notificationsAllowed,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from "../utils/notifications";
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
  /** HL-161: a nudge to start getting ready for bed */
  bedtime: Reminder;
}

export const DEFAULT_REMINDERS: Reminders = {
  morning: { enabled: true, time: "07:30" },
  activity: { enabled: true, time: "17:00" },
  evening: { enabled: false, time: "20:00" },
  bedtime: { enabled: false, time: "22:00" },
};

const NOTIFICATION_COPY: Record<keyof Reminders, { id: string; title: string; body: string }> = {
  morning: { id: "morning_reminder", title: "Morning Check-in", body: "Start your day with a HeartLink check-in." },
  evening: { id: "evening_reminder", title: "Evening Wrap-up", body: "Review your day before bedtime." },
  activity: { id: "activity_reminder", title: "Activity Goal", body: "Get a reminder to stay on track with your movement goal." },
  bedtime: {
    id: "bedtime_reminder",
    title: "Time to wind down",
    body: "Getting ready for bed now helps you sleep 7 to 9 hours. Put the screens away and dim the lights.",
  },
};

/** Reminders that no longer exist; cancelled whenever reminders are set, so an old phone stops sending them. */
export const RETIRED_IDS = ["medicine_reminder"];

/** The reminders kept on this phone (the account has no place for them yet). */
type PhoneKey = "bedtime";
const phoneKey = (key: PhoneKey, userId: string) => `@${key}_reminder_${userId}`;

async function loadPhoneReminder(key: PhoneKey, userId: string): Promise<Reminder> {
  try {
    const saved = await AsyncStorage.getItem(phoneKey(key, userId));
    if (saved) return JSON.parse(saved);
  } catch {
    // Keep the default.
  }
  return DEFAULT_REMINDERS[key];
}

/** The account's reminders, or null if they couldn't be loaded. */
export async function loadReminders(userId: string, token: string): Promise<Reminders | null> {
  const response = await apiFetch(`/api/users/${userId}/reminders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data) return null;
  return {
    morning: data.morning || { enabled: false, time: "08:00" },
    evening: data.evening || { enabled: false, time: "20:00" },
    activity: data.activity || { enabled: false, time: "17:00" },
    bedtime: await loadPhoneReminder("bedtime", userId),
  };
}

/** Saves reminders to the account (bedtime on the phone). Throws if the server refuses. */
export async function saveReminders(userId: string, token: string, reminders: Reminders): Promise<void> {
  const { bedtime, ...account } = reminders;
  await AsyncStorage.setItem(phoneKey("bedtime", userId), JSON.stringify(bedtime));
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
  await applyReminders(reminders);
  return true;
}

/** Schedules the enabled reminders on this phone and cancels the others. Doesn't ask for permission. */
async function applyReminders(reminders: Reminders): Promise<void> {
  for (const id of RETIRED_IDS) await cancelReminder(id);
  for (const key of Object.keys(NOTIFICATION_COPY) as (keyof Reminders)[]) {
    const copy = NOTIFICATION_COPY[key];
    if (reminders[key].enabled) {
      await scheduleDailyReminder(copy.id, copy.title, copy.body, reminders[key].time);
    } else {
      await cancelReminder(copy.id);
    }
  }
}

/**
 * At sign-in and app start (2026-11-18): sets this account's saved reminders again on this phone. Reminders live in
 * the phone's own scheduler, so a reinstall or a new phone lost them until the patient saved Daily reminders again.
 * Never asks for permission (that stays with setup and Settings), and does nothing when the reminders can't be loaded.
 * Returns true when they were set.
 */
export async function restoreReminders(userId: string, token: string | null): Promise<boolean> {
  try {
    if (!(await notificationsAllowed())) return false;
    const reminders = await loadReminders(userId, token ?? "");
    if (!reminders) return false;
    await applyReminders(reminders);
    return true;
  } catch {
    return false;
  }
}

/** At sign-out (2026-11-18): the next person on this phone doesn't get this account's reminders. */
export async function clearReminders(): Promise<void> {
  try {
    await cancelAllReminders();
  } catch {
    // Nothing scheduled, or the phone refused: nothing to clear.
  }
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ── HL-161: a bedtime suggestion from the person's own sleep logs ─────────────────────────────────────────────

/** Minutes after noon, so 11 PM and 1 AM average to midnight instead of to noon. */
const fromNoon = (d: Date) => (d.getHours() * 60 + d.getMinutes() + 720) % 1440;
const hhmm = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** The usual time someone goes to bed ("HH:MM", rounded to 15 minutes) from their recent sleep logs' bedtimes, or
 * null with fewer than 3 nights. */
export function usualBedtime(bedtimes: (string | null | undefined)[], nights = 7): string | null {
  const times = bedtimes
    .map((t) => (t ? new Date(t) : null))
    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
    .slice(0, nights);
  if (times.length < 3) return null;
  const avg = times.reduce((sum, d) => sum + fromNoon(d), 0) / times.length;
  return hhmm(Math.round(avg / 15) * 15 - 720);
}

/** The reminder time for a usual bedtime: 30 minutes before, to wind down. */
export function bedtimeReminderFor(usual: string): string {
  const [h, m] = usual.split(":").map(Number);
  return hhmm(h * 60 + m - 30);
}
