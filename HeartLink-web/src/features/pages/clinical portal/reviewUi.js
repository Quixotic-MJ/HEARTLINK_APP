// Shared labels and badge styles for Case Review (HL-054 / HL-055 / HL-056).

export const LANES = {
  urgent: { label: "Urgent", className: "bg-ds-rose text-ds-ink border-ds-rose" },
  rereview: { label: "Re-review", className: "bg-ds-lavender text-ds-charcoal border-ds-lavender" },
  sample: { label: "Sample", className: "bg-ds-tint text-ds-primary-pressed border-ds-tint" },
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

export const DONE_CHIP = "bg-ds-mint text-ds-charcoal border-ds-mint";
export const WAITING_CHIP = "bg-ds-yellow text-ds-warm-text border-ds-yellow-bold";
export const NOT_NEEDED_CHIP = "bg-ds-surface-alt text-ds-charcoal border-ds-hairline";

// done / waiting / not_needed (a food or exercise check with nothing recommended)
export const PROGRESS = {
  done: { label: "Done", className: DONE_CHIP },
  waiting: { label: "Waiting", className: WAITING_CHIP },
  not_needed: { label: "Not needed", className: NOT_NEEDED_CHIP },
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
  agree: { label: "Agrees with the app", className: "bg-ds-mint text-ds-charcoal border-ds-mint" },
  under: { label: "App too low (under-call)", className: "bg-ds-yellow text-ds-warm-text border-ds-yellow-bold" },
  over: { label: "App too high (over-call)", className: "bg-ds-tint text-ds-primary-pressed border-ds-tint" },
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
