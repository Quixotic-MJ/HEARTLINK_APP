/**
 * HL-122 to HL-124: the exercise safety check, built on the official PAR-Q+. Since 2026-11-12 (owner's choice, permission
 * requested from the PAR-Q+ Collaboration) the whole form is asked inside the app, with its official wording from
 * constants/parqWording.ts, and every answer is saved. Everything in this file is HeartLink's own wording. The ids match
 * the server's (backend/app/services/exercise_screening.py).
 *
 * The result only decides which exercises are offered. It never changes the Heart score.
 */
export const PARQ_PDF_URL = "https://eparmedx.com/wp-content/uploads/2025/01/PARQPlus2025Fillable.pdf";
export const PARQ_SITE_URL = "https://eparmedx.com/print-versions-of-par-q/";
export const PARQ_VERSION = "PAR-Q+ 2025";

export type ParqResult = "all_no" | "cleared_by_follow_ups" | "follow_up_yes";
export const PARQ_RESULTS: { value: ParqResult; label: string; desc?: string }[] = [
  { value: "all_no", label: "I answered NO to every question on page 1" },
  { value: "cleared_by_follow_ups", label: "I answered YES on page 1, but NO to every follow-up question" },
  { value: "follow_up_yes", label: "I answered YES to at least one follow-up question" },
];

/** HeartLink's extra check, only after a YES on page 1. */
export const EXTRA_CHECK =
  "Was any of your YES answers about chest pain, dizziness or fainting, or a doctor telling you to exercise only with medical supervision?";
export const PREGNANT_QUESTION = "Are you pregnant?";
export const UNWELL_QUESTION = "Are you ill right now with something short-term, like a cold or a fever?";
export const DECLARATION = "I filled in the PAR-Q+ myself, read it fully and answered honestly.";
/** Shown when someone ticks the declaration: the form's own declaration paragraph is above it (parqText("declaration")). */
export const DECLARATION_AGREE = "I agree with the declaration above.";

/** The form's question numbers (no wording): page 1 has 7; pages 2 and 3 have 10 condition sections with follow-ups. */
export const PAGE_ONE = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;
export type PageOneId = (typeof PAGE_ONE)[number];
export const SECTIONS: { n: string; follow_ups: string[]; label: string }[] = [
  // `label` is HeartLink's short name for the section, for the progress line; the form's own words show as the question
  { n: "1", follow_ups: ["a", "b", "c"], label: "Joints, bones and back" },
  { n: "2", follow_ups: ["a", "b"], label: "Cancer" },
  { n: "3", follow_ups: ["a", "b", "c", "d"], label: "Heart" },
  { n: "4", follow_ups: ["a", "b"], label: "Blood pressure" },
  { n: "5", follow_ups: ["a", "b", "c", "d", "e"], label: "Diabetes and metabolism" },
  { n: "6", follow_ups: ["a", "b"], label: "Mental health and learning" },
  { n: "7", follow_ups: ["a", "b", "c", "d"], label: "Breathing" },
  { n: "8", follow_ups: ["a", "b", "c"], label: "Spinal cord" },
  { n: "9", follow_ups: ["a", "b", "c"], label: "Stroke" },
  { n: "10", follow_ups: ["a", "b", "c"], label: "Other conditions" },
];
/** Page 1 questions that ask the person to list their conditions (and medicines) when the answer is YES. */
export const PAGE_ONE_LISTS: Partial<Record<PageOneId, string>> = { q4: "p1.q4_list", q5: "p1.q5_list", q6: "p1.q6_list" };

export type ParqSection = { present: boolean | null; answers: Record<string, boolean | null> };
/** Every answer in the in-app PAR-Q+, as the server takes it (`parq_form`). */
export type ParqForm = {
  page1: Record<PageOneId, boolean>;
  sections?: Record<string, { present: boolean; answers: Record<string, boolean> | null }>;
  notes?: Record<string, string>;
};

export type ScreeningAnswers = {
  /** Older app builds: what the person read off the PDF. The in-app form sends `parq_form` instead. */
  parq_result?: ParqResult;
  extra_check_yes?: boolean | null;
  parq_form?: ParqForm;
  pregnant: boolean;
  unwell: boolean;
  declared: boolean;
};

export type ScreeningState = "eligible" | "caution" | "delayed" | "locked" | "needed";
export type ScreeningStatus = {
  answered: boolean;
  paused: boolean;
  needs_assessment?: boolean;
  cleared?: boolean;
  /** Older servers leave these out. */
  state?: ScreeningState;
  beginner_only?: boolean;
  reason?: "not_done" | "old_check" | "expired" | "symptom_since" | "cleared" | null;
  expires_at?: string | null;
};

/** What each result means, shown after saving. */
export const RESULT_TEXT: Record<Exclude<ScreeningState, "needed">, { title: string; body: string; ok: boolean }> = {
  eligible: {
    title: "You're good to start gently",
    body: "All exercises are open. Stop any exercise if you get chest pain, feel dizzy or can't catch your breath.",
    ok: true,
  },
  caution: {
    title: "Beginner exercises for now",
    body: "Your answers say to start with easier exercises. Beginner workouts and breathing exercises are open. A professional can tell you when to do more.",
    ok: true,
  },
  delayed: {
    title: "Wait until you're well",
    body: "Active workouts are paused while you're pregnant or ill. Breathing exercises are still open. Do this check again when you're well, or once a health professional says it's OK.",
    ok: false,
  },
  locked: {
    title: "Please get a professional's OK first",
    body: "Based on your answers, talk to a doctor or a qualified exercise professional before active workouts, as the PAR-Q+ advises. Breathing exercises are still open. You can say when a professional has cleared you.",
    ok: false,
  },
};

/** Why the check is needed again. */
export const NEEDED_TEXT: Record<string, string> = {
  not_done: "Do the exercise safety check before your first workout.",
  old_check: "The safety check has changed. Please do it again before your next workout.",
  expired: "Your safety check is over 12 months old. Please do it again.",
  symptom_since: "You logged a serious symptom since your last safety check. Please do it again before your next workout.",
};
