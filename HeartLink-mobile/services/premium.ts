// HL-084: HeartLink Premium as the server reports it (/api/premium) and the wording the pricing screen uses.
// Premium only adds features; check-ins, emergency warnings, clinics, reminders and the score stay free.

export type PremiumPeriod = "monthly" | "yearly";
export type PaymentMethod = "gcash" | "card";

export interface PremiumStatus {
  is_premium: boolean;
  premium_until: string | null;
  source: "trial" | "checkout" | "admin" | null;
  days_left: number;
  trial_available: boolean;
  trial_days: number;
  monthly_price_php: number;
  yearly_price_php: number;
  checkout_enabled: boolean;
  test_mode: boolean;
}

export interface PremiumFeature {
  key: "reports" | "trends" | "family";
  icon: "file-chart-outline" | "chart-timeline-variant" | "account-heart-outline";
  tint: "sky" | "mint" | "peach";
  title: string;
  text: string;
  /** False until the ticket that builds it ships (HL-085..087), so the screen never promises what isn't there. */
  ready: boolean;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    key: "reports",
    icon: "file-chart-outline",
    tint: "sky",
    title: "Reports for your checkups",
    text: "A 1- or 3-month summary of your blood pressure, medicines and habits, as a PDF to show your doctor.",
    ready: true,
  },
  {
    key: "trends",
    icon: "chart-timeline-variant",
    tint: "mint",
    title: "Trends over months",
    text: "90-day and 1-year views, this month against last, and how your readings change through the day.",
    ready: true,
  },
  {
    key: "family",
    icon: "account-heart-outline",
    tint: "peach",
    title: "Family sharing",
    text: "Let someone you trust see your readings and get a notification if a reading is at an emergency level.",
    ready: true,
  },
];

export function peso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

/** What a year costs less than twelve monthly payments (0 when yearly isn't cheaper). */
export function yearlySaving(status: Pick<PremiumStatus, "monthly_price_php" | "yearly_price_php">): number {
  return Math.max(0, status.monthly_price_php * 12 - status.yearly_price_php);
}

export function priceFor(status: Pick<PremiumStatus, "monthly_price_php" | "yearly_price_php">, period: PremiumPeriod): number {
  return period === "monthly" ? status.monthly_price_php : status.yearly_price_php;
}

export function endDateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** The line under "You're on Premium", e.g. "Free trial until Nov 3, 2026 (6 days left)". */
export function premiumStatusLine(status: Pick<PremiumStatus, "source" | "premium_until" | "days_left">): string {
  const until = endDateLabel(status.premium_until);
  const what = status.source === "trial" ? "Free trial" : status.source === "admin" ? "Given by HeartLink" : "Premium";
  const left = status.days_left === 1 ? "1 day left" : `${status.days_left} days left`;
  return until ? `${what} until ${until} (${left})` : what;
}

/** From the cached profile (user.plan, user.premium_until), for places that only need a yes or no. */
export function isPremiumProfile(profile: { plan?: unknown; premium_until?: unknown } | null | undefined, now = new Date()): boolean {
  if (!profile || profile.plan !== "premium" || typeof profile.premium_until !== "string") return false;
  const until = new Date(profile.premium_until);
  return !Number.isNaN(until.getTime()) && until > now;
}
