// Shared labels and badge styles for Case Review (HL-054 / HL-055 / HL-056).

export const LANES = {
  // HL-168: the urgent and re-review lanes were removed; their cases are shown as older
  urgent: {
    label: "Older: urgent",
    className: "bg-cal-error/10 text-cal-ink border-cal-error/25",
    dotClass: "bg-cal-error",
  },
  rereview: {
    label: "Older: re-review",
    className: "bg-cal-badge-violet/15 text-cal-ink border-cal-badge-violet/25",
    dotClass: "bg-cal-badge-violet",
  },
  sample: {
    label: "Weekly sample",
    className: "bg-cal-surface-card text-cal-ink border-cal-hairline",
    dotClass: "bg-cal-muted",
  },
};

// HL-168: plain names for each expert's part
export const SECTION_LABELS = {
  cardiology: "Heart risk",
  nutrition: "Food",
  exercise: "Exercise",
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

// The habits-style levels older reviews used (before HL-153)
export const TIERS = ["Stable", "Moderate", "Elevated Risk", "Critical"];

// HL-153: the Heart risk bands the Cardiologist chooses from (AHA PREVENT, 2026 ACC/AHA bands), lowest first
export const RISK_BANDS = [
  { code: "low", label: "Low", range: "under 3%" },
  { code: "borderline", label: "Borderline", range: "3 to 4.9%" },
  { code: "intermediate", label: "Intermediate", range: "5 to 9.9%" },
  { code: "high", label: "High", range: "10% or more" },
];

// How the app worked out the Heart risk
export const RISK_KINDS = {
  calculated: "Calculated (with lab results)",
  estimated: "Estimated (machine learning, no lab results)",
};

// HL-168: the plain reasons first; the older codes still show on earlier reviews
export const REASONS = [
  { code: "blood_pressure", label: "Blood pressure" },
  { code: "smoking", label: "Smoking" },
  { code: "cholesterol", label: "Cholesterol" },
  { code: "diabetes", label: "Diabetes" },
  { code: "age", label: "Age" },
  { code: "lifestyle", label: "Lifestyle (food, activity, sleep)" },
  { code: "heart_rate", label: "Heart rate" },
  { code: "symptoms", label: "Symptoms" },
  { code: "medication", label: "Medication" },
  { code: "activity", label: "Activity" },
  { code: "nutrition_sodium", label: "Nutrition and sodium" },
  { code: "sleep", label: "Sleep" },
  { code: "baseline_information", label: "Baseline information" },
  { code: "other", label: "Something else" },
];

export const CONFIDENCE = [
  { code: "low", label: "Not very sure" },
  { code: "medium", label: "Fairly sure" },
  { code: "high", label: "Very sure" },
];

// For the research only: the person isn't told (HL-168)
export const CHECKUP = [
  { code: "not_needed", label: "No" },
  { code: "within_2_weeks", label: "Yes, within 2 weeks" },
  { code: "asap", label: "Yes, as soon as possible" },
];

export const SCORERS = {
  heart_score: "Habits score (Life's Essential 8)",
  baseline_model: "Baseline model",
  bp_rules: "Blood-pressure rules",
  lifestyle_points: "Lifestyle points",
  unknown: "Unknown scorer",
};

export const AGREEMENT = {
  agree: {
    label: "The app agreed",
    className: "bg-cal-success/10 text-cal-ink border-cal-success/25",
  },
  under: {
    label: "The app rated lower",
    className: "bg-cal-warning/12 text-cal-ink border-cal-warning/30",
  },
  over: {
    label: "The app rated higher",
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
