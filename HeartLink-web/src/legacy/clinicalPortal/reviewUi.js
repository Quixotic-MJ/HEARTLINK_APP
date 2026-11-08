// Shared labels and badge styles for Case Review (HL-054 / HL-055 / HL-056).

export const LANES = {
  urgent: {
    label: "Urgent",
    className: "bg-cal-error/10 text-cal-ink border-cal-error/25",
    dotClass: "bg-cal-error",
  },
  rereview: {
    label: "Re-review",
    className: "bg-cal-badge-violet/15 text-cal-ink border-cal-badge-violet/25",
    dotClass: "bg-cal-badge-violet",
  },
  sample: {
    label: "Sample",
    className: "bg-cal-surface-card text-cal-ink border-cal-hairline",
    dotClass: "bg-cal-muted",
  },
};

export const SECTION_LABELS = {
  cardiology: "Cardiology",
  nutrition: "Food check",
  exercise: "Exercise check",
};

export const SECTION_EXPERT = {
  cardiology: "Cardiologist",
  nutrition: "Dietitian",
  exercise: "Physical Therapist",
};

export const DONE_CHIP = "bg-cal-success/10 text-cal-ink border-cal-success/25";
export const WAITING_CHIP = "bg-cal-warning/12 text-cal-ink border-cal-warning/30";
export const NOT_NEEDED_CHIP = "bg-cal-surface-soft text-cal-muted border-cal-hairline";

// done / waiting / not_needed (a food or exercise check with nothing recommended)
export const PROGRESS = {
  done: { label: "Done", className: DONE_CHIP, dotClass: "bg-cal-success" },
  waiting: { label: "Waiting", className: WAITING_CHIP, dotClass: "bg-cal-warning" },
  not_needed: { label: "Not needed", className: NOT_NEEDED_CHIP, dotClass: "bg-cal-muted-soft" },
};

export const TIERS = ["Stable", "Moderate", "Elevated Risk", "Critical"];

export const REASONS = [
  { code: "blood_pressure", label: "Blood pressure" },
  { code: "heart_rate", label: "Heart rate" },
  { code: "symptoms", label: "Symptoms" },
  { code: "medication", label: "Medication" },
  { code: "activity", label: "Activity" },
  { code: "nutrition_sodium", label: "Nutrition and sodium" },
  { code: "sleep", label: "Sleep" },
  { code: "baseline_information", label: "Baseline information" },
  { code: "other", label: "Other" },
];

export const CONFIDENCE = [
  { code: "low", label: "Low" },
  { code: "medium", label: "Medium" },
  { code: "high", label: "High" },
];

export const CHECKUP = [
  { code: "not_needed", label: "Not needed" },
  { code: "within_2_weeks", label: "Within 2 weeks" },
  { code: "asap", label: "As soon as possible" },
];

export const SCORERS = {
  baseline_model: "Baseline model",
  bp_rules: "Blood-pressure rules",
  lifestyle_points: "Lifestyle points",
  unknown: "Unknown scorer",
};

export const AGREEMENT = {
  agree: {
    label: "Agrees with the app",
    className: "bg-cal-success/10 text-cal-ink border-cal-success/25",
  },
  under: {
    label: "App too low (under-call)",
    className: "bg-cal-warning/12 text-cal-ink border-cal-warning/30",
  },
  over: {
    label: "App too high (over-call)",
    className: "bg-cal-surface-card text-cal-ink border-cal-hairline",
  },
};

export const labelOf = (list, code) => (list.find((o) => o.code === code) || {}).label || code;

export const waitingText = (hours) => {
  if (hours == null) return "";
  if (hours < 1) return "under 1 h";
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

// Which section the signed-in expert answers, or null for admins and other roles.
export const mySection = (user) => {
  if (user?.role !== "medical_expert") return null;
  return Object.keys(SECTION_EXPERT).find((s) => SECTION_EXPERT[s] === user?.expert_type) || null;
};
