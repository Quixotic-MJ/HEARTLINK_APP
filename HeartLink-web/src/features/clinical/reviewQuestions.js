// HL-168 (panel revision): the expert's questions, one at a time, in plain words for reviewers who aren't technical.
// The answers saved are the same codes as before (heart risk band, reasons, confidence, checkup, item verdicts).

export const RISK_LEVELS = [
  { code: "low", label: "Low", meaning: "Fewer than 3 in 100 people like them" },
  { code: "borderline", label: "Borderline", meaning: "3 to 4 in 100" },
  { code: "intermediate", label: "Intermediate", meaning: "5 to 9 in 100" },
  { code: "high", label: "High", meaning: "10 or more in 100" },
];

export const PLAIN_REASONS = [
  { code: "blood_pressure", label: "Blood pressure" },
  { code: "smoking", label: "Smoking" },
  { code: "cholesterol", label: "Cholesterol" },
  { code: "diabetes", label: "Diabetes" },
  { code: "age", label: "Age" },
  { code: "symptoms", label: "Symptoms" },
  { code: "lifestyle", label: "Lifestyle (food, activity, sleep)" },
  { code: "other", label: "Something else" },
];

export const HOW_SURE = [
  { code: "low", label: "Not very sure" },
  { code: "medium", label: "Fairly sure" },
  { code: "high", label: "Very sure" },
];

export const ADVISE_CHECKUP = [
  { code: "not_needed", label: "No" },
  { code: "within_2_weeks", label: "Yes, within 2 weeks" },
  { code: "asap", label: "Yes, as soon as possible" },
];

export const CARDIO_QUESTIONS = [
  { key: "risk", title: "How likely is this person to have a heart attack or stroke in the next 10 years?" },
  { key: "reasons", title: "What made you choose this?", hint: "Tick everything that mattered." },
  { key: "sure", title: "How sure are you?" },
  {
    key: "checkup",
    title: "Would you advise this person to see a doctor in person?",
    hint: "For the research only. The person isn't told.",
  },
];

/** Whether the Cardiologist can go past this question. */
export function cardioAnswered(key, a) {
  if (key === "risk") return Boolean(a.band) && (a.percent === "" || a.percent == null || validPercent(a.percent));
  if (key === "reasons") return (a.reasons || []).length > 0;
  if (key === "sure") return Boolean(a.confidence);
  if (key === "checkup") return Boolean(a.checkup);
  return true;
}

export function validPercent(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 100;
}

const labelOf = (list, code) => list.find((o) => o.code === code)?.label || code;

/** The "Check your answers" lines. */
export function cardioSummary(a) {
  return [
    ["Heart risk", `${labelOf(RISK_LEVELS, a.band)}${a.percent !== "" && a.percent != null ? ` (your number: ${a.percent}%)` : ""}`],
    ["Why", (a.reasons || []).map((r) => labelOf(PLAIN_REASONS, r)).join(", ")],
    ["How sure", labelOf(HOW_SURE, a.confidence)],
    ["See a doctor in person", labelOf(ADVISE_CHECKUP, a.checkup)],
    ...(a.notes?.trim() ? [["Note", a.notes.trim()]] : []),
  ];
}

const ORDER = RISK_LEVELS.map((l) => l.code);

/** After submitting: what the app said, in one or two plain sentences. */
export function resultSentence(expertBand, appRisk) {
  const you = labelOf(RISK_LEVELS, expertBand);
  if (!appRisk || !ORDER.includes(appRisk.band)) {
    return `You said ${you}. The app had no heart risk for this person to compare (under 30, over 79, or missing answers).`;
  }
  const app = labelOf(RISK_LEVELS, appRisk.band);
  const inHundred = appRisk.percent != null ? ` (about ${Math.max(1, Math.round(appRisk.percent))} in 100)` : "";
  const diff = ORDER.indexOf(expertBand) - ORDER.indexOf(appRisk.band);
  const verdict =
    diff === 0 ? "The app agreed with you." : diff > 0 ? "The app rated this person lower than you." : "The app rated this person higher than you.";
  return `The app said ${app}${inHundred}. You said ${you}. ${verdict}`;
}

// --- Dietitian and Physical Therapist: one item per screen ------------------------------------------------------

export const ITEM_CHOICES = [
  { code: "ok", label: "Yes" },
  { code: "changes", label: "Yes, with changes" },
  { code: "no", label: "No" },
];

export function itemQuestion(section) {
  return section === "nutrition"
    ? "Would you suggest this recipe to this person?"
    : "Would you suggest this exercise to this person?";
}

export function noteQuestion(verdict) {
  return verdict === "changes" ? "What should change?" : "Why not?";
}

export function itemAnswered(answer) {
  if (!answer?.verdict) return false;
  return answer.verdict === "ok" || Boolean((answer.note || "").trim());
}

export function itemCounter(section, index, total) {
  return `${section === "nutrition" ? "Recipe" : "Exercise"} ${index + 1} of ${total}`;
}
