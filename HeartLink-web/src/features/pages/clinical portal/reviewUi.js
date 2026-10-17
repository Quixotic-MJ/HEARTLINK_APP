// Shared labels and badge styles for Case Review (HL-054 / HL-055 / HL-056).

export const LANES = {
  urgent: { label: "Urgent", className: "bg-[#F7E4E1] text-[#8A1F17] border-[#F0C4B8]" },
  rereview: { label: "Re-review", className: "bg-[#EFE8F7] text-[#5B3A8C] border-[#DCCDEE]" },
  sample: { label: "Sample", className: "bg-[#EAF5FC] text-[#0F4C82] border-[#CDE1F4]" },
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

export const DONE_CHIP = "bg-[#E3EFEC] text-[#14534B] border-[#C5DFD8]";
export const WAITING_CHIP = "bg-[#F6EDDD] text-[#7A5414] border-[#EBD7B8]";
export const NOT_NEEDED_CHIP = "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]";

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
  agree: { label: "Agrees with the app", className: "bg-[#E3EFEC] text-[#14534B] border-[#C5DFD8]" },
  under: { label: "App too low (under-call)", className: "bg-[#FDF3E7] text-[#7A4A0B] border-[#EBC99A]" },
  over: { label: "App too high (over-call)", className: "bg-[#EAF5FC] text-[#0F4C82] border-[#CDE1F4]" },
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
