import type { ChoiceOption } from "../components/onboarding/Controls";

/**
 * HL-164 (panel revision): the health check before setup and the patient's main goal.
 *
 * - HeartLink isn't made for people with these conditions. Someone who ticks one is advised not to use the app, and can
 *   only go on after saying their doctor OK'd it (the server refuses a condition without that, too).
 * - The main goal is picked in setup (Part 1) and can be changed in Goals & limits. It's shown on the dashboard.
 */

export type HealthCondition = "heart_disease" | "stroke" | "kidney_disease" | "pregnancy";

export const HEALTH_CONDITIONS: (ChoiceOption & { value: HealthCondition; short: string })[] = [
  {
    value: "heart_disease",
    label: "Heart disease",
    short: "heart disease",
    desc: "A heart attack, angina, heart failure, valve disease, an irregular heartbeat such as AFib, or a heart operation or stent",
  },
  { value: "stroke", label: "Stroke or mini-stroke", short: "had a stroke or mini-stroke", desc: "Including a TIA (mini-stroke)" },
  { value: "kidney_disease", label: "Kidney disease", short: "kidney disease", desc: "Long-term kidney disease, or on dialysis" },
  { value: "pregnancy", label: "I'm pregnant", short: "are pregnant" },
];

export const NO_CONDITION = "none";

export type MainGoal =
  | "lower_bp"
  | "heart_healthy"
  | "move_more"
  | "less_salt"
  | "sleep_better"
  | "healthy_weight"
  | "quit_smoking";

export const MAIN_GOALS: (ChoiceOption & { value: MainGoal })[] = [
  { value: "lower_bp", label: "Lower my blood pressure" },
  { value: "heart_healthy", label: "Keep my heart healthy" },
  { value: "move_more", label: "Move more" },
  { value: "less_salt", label: "Eat less salt" },
  { value: "sleep_better", label: "Sleep better" },
  { value: "healthy_weight", label: "Reach a healthy weight" },
  { value: "quit_smoking", label: "Quit smoking" },
];

export function goalLabel(goal: string | null | undefined): string | null {
  return MAIN_GOALS.find((g) => g.value === goal)?.label ?? null;
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** "You told us you have heart disease and kidney disease" (or "...you're pregnant"). */
export function conditionsSentence(conditions: string[]): string {
  const picked = HEALTH_CONDITIONS.filter((c) => conditions.includes(c.value));
  const have = picked.filter((c) => c.value === "heart_disease" || c.value === "kidney_disease").map((c) => c.short);
  const parts: string[] = [];
  if (have.length) parts.push(`have ${joinWords(have)}`);
  if (conditions.includes("stroke")) parts.push("have had a stroke or mini-stroke");
  if (conditions.includes("pregnancy")) parts.push("are pregnant");
  return `You told us you ${joinWords(parts)}.`;
}

type ScreeningDraft = {
  agreed_notice?: boolean;
  health_check_done?: boolean;
  health_conditions?: string[];
  doctor_cleared?: boolean;
};

/**
 * True until this phone's setup draft has the notice ticked and the health check answered (with the doctor's OK when a
 * condition was ticked). The set-up map sends people back to "Before we start" until then, so reopening the app halfway
 * through setup never skips the health check.
 */
export function needsScreening(d: ScreeningDraft): boolean {
  if (!d.agreed_notice || !d.health_check_done) return true;
  return (d.health_conditions?.length ?? 0) > 0 && d.doctor_cleared !== true;
}

/** 2026-11-24 (panel revision): HeartLink can't check the doctor's OK, so the tick box says it's the user's word. */
export const DOCTOR_OK = "I talked to my doctor about my condition, and they said I can use HeartLink.";

/** 2026-11-25 (panel revision): "Is HeartLink for you?" before sign-up (app/(auth)/who-its-for.tsx). */
export const MADE_FOR: { title: string; body: string }[] = [
  { title: "Want to keep your heart healthy", body: "Build everyday habits: blood pressure, meals, movement and sleep." },
  {
    title: "Are at risk and want to manage it",
    body: "For example high blood pressure, high cholesterol or a lot of salt in your food. Lab results are optional.",
  },
];

/** The conditions HeartLink isn't made for: the same as the health check after sign-up (HL-164). */
export const NOT_MADE_FOR: { title: string; body?: string }[] = HEALTH_CONDITIONS.map((c) => ({
  title: c.value === "pregnancy" ? "A pregnancy" : c.label,
  body: c.desc,
}));

