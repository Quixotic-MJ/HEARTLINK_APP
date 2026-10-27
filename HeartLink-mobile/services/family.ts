/**
 * HL-087: family sharing (Premium for the patient), from /api/family. A Premium patient makes a one-time code;
 * whoever enters it follows them: a read-only summary and a notification about an emergency-level reading.
 */
import type { Pressure, TrendDay } from "./trends";

export type Invite = { code: string; expires_at: string };
export type Follower = { id: string; name: string; since: string };
export type Followed = { id: string; name: string; since: string; paused: boolean };

export type SharingStatus = { is_premium: boolean; invite: Invite | null; followers: Follower[]; max_followers: number };

export type SummaryDay = { date: string; systolic: number | null; diastolic: number | null; score: number | null };

export type FamilySummary =
  | { id: string; name: string; paused: true }
  | {
      id: string;
      name: string;
      paused: false;
      latest_bp: { systolic: number; diastolic: number; at: string } | null;
      latest_pulse: { bpm: number; at: string } | null;
      score: { value: number; at: string } | null;
      last_check_in: string | null;
      days: SummaryDay[];
      open_alerts: { type: string; severity: string | null; at: string }[];
    };

export type AccountKind = "patient" | "family";

/** True for an account made only to follow family members (no health setup). */
export const isFamilyAccount = (profile: { account_kind?: unknown } | null | undefined) => profile?.account_kind === "family";

/** Where a family-only account may be (route segments): its Family screens, Settings and Notifications. */
export function familyCanOpen(segments: string[]): boolean {
  const [first, second, third] = segments;
  if (first === "(family)") return true;
  return first === "(home)" && (second === "(settings)" || (second === "(profile)" && third === "notifications"));
}

const CODE_CHARS = /[^A-HJKMNP-Z2-9]/g; // the server's alphabet: no 0/O, 1/I/L

/** What's typed ("k7m q2p") as the code, at most 6 characters. */
export function cleanCode(typed: string): string {
  return typed.toUpperCase().replace(CODE_CHARS, "").slice(0, 6);
}

/** "K7MQ2P" shown as "K7M-Q2P", easier to read out. */
export function showCode(code: string): string {
  return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

/** "Expires today at 7:05 PM" or "Expires tomorrow at 7:05 PM". */
export function expiresLine(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  return `Expires ${sameDay ? "today" : "tomorrow"} at ${time}`;
}

/** "Just now", "3 hours ago", "2 days ago", "Oct 9". */
export function agoLine(iso: string | null, now = new Date()): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "Yesterday" : `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The invite message the patient sends. */
export function inviteMessage(code: string): string {
  return (
    `I'd like you to follow my heart readings on HeartLink. Open the HeartLink app, choose "Follow a family member" ` +
    `and enter this code: ${showCode(code)}. It works once, for 24 hours.`
  );
}

function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The 30 days as chart points. */
export function summaryChart(days: SummaryDay[]): { days: TrendDay[]; pressure: (Pressure | null)[]; scores: (number | null)[] } {
  return {
    days: days.map((d) => ({ key: d.date, date: localDate(d.date) })),
    pressure: days.map((d) => (d.systolic && d.diastolic ? { sys: d.systolic, dia: d.diastolic } : null)),
    scores: days.map((d) => d.score),
  };
}
