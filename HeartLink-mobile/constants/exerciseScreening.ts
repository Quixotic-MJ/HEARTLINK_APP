/**
 * HL-122 to HL-124: the exercise safety check, built on the official PAR-Q+. Its terms don't allow putting the form inside an
 * app without the PAR-Q+ Collaboration's written consent, so the app opens the official, unchanged PDF and the person
 * records what it showed. Everything below is HeartLink's own wording. The ids match the server's
 * (backend/app/services/exercise_screening.py).
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

export type ScreeningAnswers = {
  parq_result: ParqResult;
  extra_check_yes: boolean | null;
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
