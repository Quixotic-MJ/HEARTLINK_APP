/**
 * HL-087: family sharing (Premium for the patient), from /api/family. A Premium patient makes a one-time code;
 * whoever enters it follows them: a read-only summary and a notification about an emergency-level reading.
 */
import type { Pressure, TrendDay } from "./trends";

export type Invite = { code: string; expires_at: string };
export type Follower = { id: string; name: string; since: string };
export type Followed = { id: string; name: string; since: string; paused: boolean };

export type SharingStatus = {
  is_premium: boolean;
  invite: Invite | null;
  followers: Follower[];
  max_followers: number;
  // HL-154: followers are told after 2 days without a blood pressure reading (older servers leave it out)
  nudges_enabled?: boolean;
};

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
      // HL-139: the Heart risk (older servers leave it out)
      heart_risk?: { percent: number; band: string; kind: "calculated" | "estimated"; at: string } | null;
      last_check_in: string | null;
      days: SummaryDay[];
      open_alerts: { type: string; severity: string | null; at: string }[];
      // HL-154: the patient's own medicine answers (older servers leave it out)
      medicine?: { today: boolean | null; week: { taken: number; answered: number } };
      // HL-161: the last 7 days as a table (older servers leave it out)
      week?: WeekTable;
    };

// ── HL-161: the last 7 days in plain words, for family members who aren't health workers ─────────────────────────

/** The American Heart Association categories the server uses (health_report.bp_category). */
export type BpCategory = "normal" | "elevated" | "stage_1" | "stage_2" | "crisis" | "low";

export type WeekDay = {
  date: string;
  /** The day's highest reading */
  bp: { systolic: number; diastolic: number; category: BpCategory; readings: number } | null;
  pulse: number | null;
  medicine: boolean | null;
  logged: boolean;
};

export type WeekTable = {
  days: WeekDay[];
  readings: number;
  highest: { systolic: number; diastolic: number; category: BpCategory; date: string } | null;
};

/** Plain words and colours (design-system tones) for each category. "Emergency" matches the app's own emergency rule:
 * 180/120 or more, or under 90/60. */
export const BP_WORDS: Record<BpCategory, { label: string; tone: "mint" | "yellow" | "peach" | "rose"; urgent: boolean }> = {
  normal: { label: "Normal", tone: "mint", urgent: false },
  elevated: { label: "A little high", tone: "yellow", urgent: false },
  stage_1: { label: "High", tone: "peach", urgent: false },
  stage_2: { label: "Very high", tone: "rose", urgent: false },
  crisis: { label: "Emergency: very high", tone: "rose", urgent: true },
  low: { label: "Emergency: too low", tone: "rose", urgent: true },
};

/** The same rule as the server's bp_category (backend/app/services/health_report.py), most urgent first. */
export function bpCategory(systolic: number, diastolic: number): BpCategory {
  if (systolic >= 180 || diastolic >= 120) return "crisis";
  if (systolic < 90 || diastolic < 60) return "low";
  if (systolic >= 140 || diastolic >= 90) return "stage_2";
  if (systolic >= 130 || diastolic >= 80) return "stage_1";
  if (systolic >= 120) return "elevated";
  return "normal";
}

/** One line under the table, so the words mean something. */
export const BP_LEGEND = "Normal is under 120/80. Emergency is 180/120 or more, or under 90/60.";

/** "Today", "Yesterday", or "Wed, Nov 12". */
export function weekDayLabel(iso: string, now = new Date()): string {
  const d = localDate(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** The week in one or two plain sentences, from what was logged. */
export function weekSentence(name: string, week: WeekTable, now = new Date()): string {
  const logged = week.days.filter((d) => d.logged).length;
  if (!logged) return `${name} didn't log anything in the last 7 days.`;
  const first = `${name} logged something on ${logged} of the last 7 days.`;
  const withBp = week.days.filter((d) => d.bp);
  if (!withBp.length || !week.highest) return `${first} There were no blood pressure readings.`;
  const counts = new Map<BpCategory, number>();
  withBp.forEach((d) => counts.set(d.bp!.category, (counts.get(d.bp!.category) ?? 0) + 1));
  const [common, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const label = BP_WORDS[common].label;
  const pattern =
    withBp.length === 1
      ? `Blood pressure on 1 day: ${label}.`
      : n === withBp.length
        ? `Blood pressure on ${withBp.length} days, all ${label}.`
        : n * 2 > withBp.length
          ? `Blood pressure on ${withBp.length} days, mostly ${label}.`
          : `Blood pressure on ${withBp.length} days, most often ${label}.`;
  const h = week.highest;
  const when = weekDayLabel(h.date, now);
  return (
    `${first} ${pattern} ` +
    `The highest was ${h.systolic}/${h.diastolic} (${BP_WORDS[h.category].label}) ${when === "Today" || when === "Yesterday" ? when.toLowerCase() : `on ${when}`}.`
  );
}

/** The medicine column. */
export function medicineMark(taken: boolean | null): string {
  return taken === true ? "Taken" : taken === false ? "Not taken" : "Not answered";
}

/** HL-154: the "Medicine today" tile. */
export function medicineToday(today: boolean | null | undefined): string {
  return today === true ? "Taken" : today === false ? "Not taken" : "Not answered";
}

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
