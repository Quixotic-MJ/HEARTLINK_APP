// Labels for the care-team pages. Blood-pressure bands follow the backend's score rules
// (backend/app/services/hss_service.py): very high 180/120, high 140/90, raised 130/80, low under 90/60.
// Cal.com semantic pills: tinted hairline surface + high-contrast #111111 ink + 6px status dot.
const ROSE = "border-cal-error/25 bg-cal-error/10 text-cal-ink";
const AMBER = "border-cal-warning/35 bg-cal-warning/15 text-cal-ink";
const EMERALD = "border-cal-success/25 bg-cal-success/10 text-cal-ink";
const NEUTRAL = "border-cal-hairline bg-cal-surface-card text-cal-muted";

export function bpBand(systolic, diastolic) {
  if (systolic == null || diastolic == null) return null;
  if (systolic >= 180 || diastolic >= 120) {
    return { label: "Very high", className: ROSE, dotClass: "bg-cal-error", attention: true };
  }
  if (systolic < 90 || diastolic < 60) {
    return { label: "Low", className: ROSE, dotClass: "bg-cal-error", attention: true };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { label: "High", className: ROSE, dotClass: "bg-cal-error", attention: true };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return { label: "Raised", className: AMBER, dotClass: "bg-cal-warning", attention: false };
  }
  return { label: "In range", className: EMERALD, dotClass: "bg-cal-success", attention: false };
}

export function tierClass(tier) {
  if (tier === "Stable") return EMERALD;
  if (tier === "Moderate") return AMBER;
  if (tier === "Elevated Risk" || tier === "Critical") return ROSE;
  return NEUTRAL;
}

export function tierDotClass(tier) {
  if (tier === "Stable") return "bg-cal-success";
  if (tier === "Moderate") return "bg-cal-warning";
  if (tier === "Elevated Risk" || tier === "Critical") return "bg-cal-error";
  return "bg-cal-muted-soft";
}

export const TAG =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap";

// HL-146: the Heart risk (AHA PREVENT 10-year ASCVD, lower is better), as the backend sends it
// (backend/app/services/heart_risk.py). Bands from the 2026 ACC/AHA guideline: under 3% Low, 3-4.9% Borderline,
// 5-9.9% Intermediate, 10%+ High.
const RISK_BANDS = {
  low: { label: "Low", className: EMERALD, dotClass: "bg-cal-success" },
  borderline: { label: "Borderline", className: AMBER, dotClass: "bg-cal-warning" },
  intermediate: { label: "Intermediate", className: AMBER, dotClass: "bg-cal-warning" },
  high: { label: "High", className: ROSE, dotClass: "bg-cal-error" },
};

export function riskBand(band) {
  return RISK_BANDS[band] || { label: band || "No band", className: NEUTRAL, dotClass: "bg-cal-muted-soft" };
}

export function riskPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  return n < 1 ? "Under 1%" : `${n.toFixed(1).replace(/\.0$/, "")}%`;
}

/** A score history record's Heart risk ({available, ascvd_10, band, kind, ...}), or null for older records. */
export function riskOfRecord(record) {
  const risk = record?.contributing_factors?.risk;
  return risk && typeof risk === "object" && "available" in risk ? risk : null;
}

/** Why a record has no Heart risk number, in a few words. */
export function riskMissingText(risk) {
  if (!risk) return "Not worked out";
  switch (risk.reason) {
    case "age":
      return "Ages 30 to 79 only";
    case "questions":
      return "3 questions not answered";
    case "profile":
      return "Age or sex missing";
    default:
      return "Not worked out";
  }
}

// 2026-11-12: the patient's answers from setup (true, false, or not answered)
export function answerText(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not answered";
}

// 2026-11-12: the exercise safety check (PAR-Q+) result, as the backend sends it
// (backend/app/services/exercise_screening.py). It decides which exercises the app offers, never the score.
const NEEDED_REASON = {
  not_done: "Not answered yet",
  old_check: "Only the old 5-question check was answered",
  expired: "Over 12 months old",
  symptom_since: "A severe symptom was logged since it was answered",
};

export function exerciseCheckView(check) {
  const state = check?.state;
  if (state === "eligible") {
    return { label: "Eligible", detail: "All NO on page 1: every approved exercise.", className: EMERALD, dotClass: "bg-cal-success" };
  }
  if (state === "caution") {
    return check.cleared
      ? { label: "Cleared", detail: "A professional cleared them: beginner exercises and breathing.", className: AMBER, dotClass: "bg-cal-warning" }
      : { label: "Eligible with caution", detail: "Cleared through the follow-up questions: beginner exercises and breathing.", className: AMBER, dotClass: "bg-cal-warning" };
  }
  if (state === "delayed") {
    return { label: "Delayed", detail: "Pregnant or unwell right now: breathing only until they answer it again.", className: AMBER, dotClass: "bg-cal-warning" };
  }
  if (state === "locked") {
    return { label: "Locked", detail: "A follow-up YES or HeartLink's extra check: breathing only until a professional clears them.", className: ROSE, dotClass: "bg-cal-error" };
  }
  return {
    label: "Needs answering",
    detail: `${NEEDED_REASON[check?.reason] ?? "Not answered yet"}: breathing only until they answer it.`,
    className: NEUTRAL,
    dotClass: "bg-cal-muted-soft",
  };
}
