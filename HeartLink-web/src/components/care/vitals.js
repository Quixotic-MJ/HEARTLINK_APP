// Labels for the care-team pages. Blood-pressure bands follow the backend's score rules
// (backend/app/services/hss_service.py): very high 180/120, high 140/90, raised 130/80, low under 90/60.
// Pastel tag with dark text, as in HEARTLINK.md: rose = needs attention, yellow = watch, mint = fine.
const ROSE = "bg-ds-rose text-ds-ink";
const YELLOW = "bg-ds-yellow text-ds-warm-text";
const MINT = "bg-ds-mint text-ds-charcoal";

export function bpBand(systolic, diastolic) {
  if (systolic == null || diastolic == null) return null;
  if (systolic >= 180 || diastolic >= 120) return { label: "Very high", className: ROSE, attention: true };
  if (systolic < 90 || diastolic < 60) return { label: "Low", className: ROSE, attention: true };
  if (systolic >= 140 || diastolic >= 90) return { label: "High", className: ROSE, attention: true };
  if (systolic >= 130 || diastolic >= 80) return { label: "Raised", className: YELLOW, attention: false };
  return { label: "In range", className: MINT, attention: false };
}

export function tierClass(tier) {
  if (tier === "Stable") return MINT;
  if (tier === "Moderate") return YELLOW;
  if (tier === "Elevated Risk" || tier === "Critical") return ROSE;
  return "bg-ds-surface-alt text-ds-slate";
}

export const TAG = "inline-flex items-center px-2 py-0.5 rounded-[6px] text-[12px] font-semibold whitespace-nowrap";
