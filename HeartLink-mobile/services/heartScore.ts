import type { Feather } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

/**
 * How the Heart score is shown. The server works it out (backend/app/services/heart_score.py) and sends its details as
 * `hss_factors`; this turns them into plain words. It's based on the American Heart Association's Life's Essential 8.
 */
export type HeartArea = {
  points: number;
  systolic?: number;
  diastolic?: number;
  readings?: number;
  days?: number;
  minutes?: number;
  goal?: number;
  from?: "setup" | "logs";
  hours?: number;
  nights?: number;
  status?: "never" | "current" | "quit";
  quit_when?: string | null;
  bmi?: number;
  sodium_days_over?: number;
  meal_days?: number;
  sodium_from?: "setup" | "logs";
  // HL-138: lab results
  non_hdl?: number;
  medicine?: boolean;
  hba1c?: number | null;
  fasting?: number | null;
  diabetes?: boolean;
  test_date?: string;
};

export type HeartFactors = {
  areas?: Record<string, HeartArea> | null;
  areas_used?: number;
  areas_total?: number;
  average?: number;
  rule?: string | null;
};

export type AreaTint = "rose" | "mint" | "lavender" | "sky" | "peach";

export const AHA_PAPER_URL = "https://pmc.ncbi.nlm.nih.gov/articles/PMC10503546/";

// Blood pressure comes first: it's the point of the app
export const AREA_ROWS: { key: string; label: string; icon: keyof typeof Feather.glyphMap; tint: AreaTint; missing: string }[] = [
  { key: "blood_pressure", label: "Blood pressure", icon: "heart", tint: "rose", missing: "No reading in the last 30 days" },
  { key: "activity", label: "Activity", icon: "activity", tint: "mint", missing: "Nothing logged yet" },
  { key: "sleep", label: "Sleep", icon: "moon", tint: "lavender", missing: "No sleep logged this week" },
  { key: "nicotine", label: "Nicotine", icon: "wind", tint: "sky", missing: "Answer in Settings" },
  { key: "body_weight", label: "Body weight", icon: "bar-chart-2", tint: "sky", missing: "Not scored yet" },
  { key: "diet", label: "Diet", icon: "coffee", tint: "peach", missing: "Answer in Settings" },
  // HL-138: the AHA's two lab areas, scored only when the person adds a result from the last 12 months
  { key: "cholesterol", label: "Cholesterol", icon: "droplet", tint: "rose", missing: "Optional: add a lab result" },
  { key: "blood_sugar", label: "Blood sugar", icon: "activity", tint: "lavender", missing: "Optional: add a lab result" },
];

/** The lab areas, which only count when the person added a result. */
export const LAB_AREA_KEYS = ["cholesterol", "blood_sugar"];

const testedOn = (d?: string) =>
  d ? `, tested ${new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : "";

const times = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const QUIT_TEXT: Record<string, string> = {
  under_1_year: "Quit less than a year ago",
  "1_to_5_years": "Quit 1 to 5 years ago",
  "5_plus_years": "Quit 5 or more years ago",
};

/** One line on the data behind an area's points. */
export function areaDetail(key: string, a: HeartArea): string {
  switch (key) {
    case "blood_pressure":
      return a.days === 7
        ? `${a.systolic}/${a.diastolic}, average of ${times(a.readings ?? 0, "reading")} this week`
        : `${a.systolic}/${a.diastolic}, your latest reading`;
    case "activity":
      return a.from === "setup"
        ? "From your setup answers for now"
        : `${a.minutes ?? 0} of ${a.goal ?? 150} minutes this week`;
    case "sleep":
      return a.from === "setup"
        ? `${a.hours} hours, from your setup answers`
        : `${a.hours} hours on average, ${times(a.nights ?? 0, "night")} logged`;
    case "nicotine":
      if (a.status === "never") return "Never smoked";
      if (a.status === "current") return "Smoking or vaping now";
      return (a.quit_when && QUIT_TEXT[a.quit_when]) || "Quit. Tell us when in Settings";
    case "body_weight":
      return `BMI ${a.bmi}`;
    case "diet":
      return a.sodium_from === "logs"
        ? `Sodium over your limit on ${a.sodium_days_over ?? 0} of the last 7 days`
        : "From your setup answers for now";
    case "cholesterol":
      return `Non-HDL ${a.non_hdl} mg/dL${a.medicine ? ", on medicine (minus 20)" : ""}${testedOn(a.test_date)}`;
    case "blood_sugar": {
      const value = a.hba1c !== null && a.hba1c !== undefined ? `HbA1c ${a.hba1c}%` : `Fasting ${a.fasting} mg/dL`;
      return `${value}${a.diabetes ? ", with diabetes" : ""}${testedOn(a.test_date)}`;
    }
    default:
      return "";
  }
}

/** "Based on 6 of 8 areas", or, before the first log, what the score is instead. */
export function basedOnText(f: HeartFactors | null | undefined): string | null {
  if (!f) return null;
  if (f.areas_used && f.areas_total) return `Based on ${f.areas_used} of ${f.areas_total} areas`;
  return f.areas ? null : "Starting estimate from your setup answers";
}

/** Blood pressure, shown under the heart because good habits can't make up for it. */
export function pressureText(f: HeartFactors | null | undefined): string | null {
  if (!f?.areas) return null;
  const a = f.areas.blood_pressure;
  if (!a) return "No recent blood pressure reading";
  return a.days === 7 ? `Blood pressure ${a.systolic}/${a.diastolic}, this week's average` : `Blood pressure ${a.systolic}/${a.diastolic}, your latest reading`;
}

export type HeartAnswers = {
  ever_smoked?: boolean;
  smoke_now?: string | null;
  smoke_quit_when?: string | null;
  fruit_veg_servings?: string;
  fried_food_freq?: string;
  salty_food_freq?: string;
  // HL-140: for the Heart risk; null until answered
  bp_medicine?: boolean | null;
  has_diabetes?: boolean | null;
  cholesterol_medicine?: boolean | null;
};

/** The smoking and diet answers from setup. */
export async function loadHeartAnswers(userId: string): Promise<HeartAnswers> {
  const res = await apiFetch(`/api/users/${userId}/profile`);
  if (!res.ok) throw new Error("Couldn't load the answers");
  const body = await res.json();
  const saved = (body?.data ?? body)?.baselines?.onboarding ?? {};
  return {
    ever_smoked: !!saved.ever_smoked,
    smoke_now: saved.smoke_now ?? null,
    smoke_quit_when: saved.smoke_quit_when ?? null,
    fruit_veg_servings: saved.fruit_veg_servings ?? "",
    fried_food_freq: saved.fried_food_freq ?? "",
    salty_food_freq: saved.salty_food_freq ?? "",
    bp_medicine: saved.bp_medicine ?? null,
    has_diabetes: saved.has_diabetes ?? null,
    cholesterol_medicine: saved.cholesterol_medicine ?? null,
  };
}

/** Saves the answers; the server then updates the score. Follow-up answers that no longer apply are sent empty. */
export async function saveHeartAnswers(userId: string, a: HeartAnswers): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}/baseline/answers`, {
    method: "PUT",
    body: JSON.stringify({
      ...a,
      smoke_now: a.ever_smoked ? a.smoke_now : null,
      smoke_quit_when: a.ever_smoked && a.smoke_now === "Not at all" ? a.smoke_quit_when : null,
    }),
  });
  if (!res.ok) throw new Error("Couldn't save the answers");
}

/** Why the score isn't simply the average, when one of HeartLink's own rules changed it. */
export function ruleText(rule: string | null | undefined): string | null {
  switch (rule) {
    case "emergency_limit":
      return "Your latest reading was at an emergency level, so your score stays under 50 until a later reading isn't.";
    case "stage_2_limit":
      return "Your average blood pressure is 140/90 or higher, so your score can't go above 59.";
    case "stage_1_limit":
      return "Your average blood pressure is 130/80 or higher, so your score can't go above 79.";
    case "no_recent_reading":
      return "You have no blood pressure reading from the last 30 days, so your score can't go above 79.";
    case "floor":
      return "Your score doesn't go below 50 unless a reading is at an emergency level.";
    default:
      return null;
  }
}
