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
