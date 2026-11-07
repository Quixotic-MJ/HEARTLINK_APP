import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The Dashboard's "Your weekly report is ready" banner appears once a week, when there's enough logged for the report
 * to say something. The report itself can always be opened from Profile.
 */
export const REPORT_EVERY_DAYS = 7;
export const MIN_LOGGED_DAYS = 3;

export type WeeklyReportStatus = { logged_days?: number; account_age_days?: number };

const openedKey = (userId: string) => `@weekly_report_opened_${userId}`;

function calendarDaysBetween(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

/** `lastOpenedAt`: when the report was last opened on this phone; null if never. */
export function isWeeklyReportReady(status: WeeklyReportStatus | null | undefined, lastOpenedAt: string | null, now = new Date()) {
  const loggedDays = status?.logged_days;
  const accountAgeDays = status?.account_age_days;
  // A server without these numbers, or one that hasn't answered yet, never claims the report is ready
  if (typeof loggedDays !== "number" || typeof accountAgeDays !== "number") return false;
  if (accountAgeDays < REPORT_EVERY_DAYS || loggedDays < MIN_LOGGED_DAYS) return false;
  if (!lastOpenedAt) return true;
  const opened = new Date(lastOpenedAt);
  if (Number.isNaN(opened.getTime())) return true;
  return calendarDaysBetween(opened, now) >= REPORT_EVERY_DAYS;
}

export async function getWeeklyReportOpenedAt(userId: string) {
  return AsyncStorage.getItem(openedKey(userId));
}

export async function markWeeklyReportOpened(userId: string, now = new Date()) {
  await AsyncStorage.setItem(openedKey(userId), now.toISOString());
}
