import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  CloudOff,
  Download,
  Dumbbell,
  FileText,
  HeartHandshake,
  MapPin,
  Menu,
  PhoneCall,
  ShieldCheck,
  SlidersHorizontal,
  Utensils,
  X,
} from "lucide-react";
import { HeartLogoIcon } from "../auth/login";

// The public home page of the portal: what the app does, pricing, FAQs, and where to get it. Staff sign in at /login.
// Styled with the Cal.com Design System preview tokens (--color-cal-*, --font-cal-*) so it can be
// evaluated safely without modifying portal-wide ds-* components.
const APK_URL = import.meta.env.VITE_APK_URL || "";

// Matches DEFAULT_CONFIG in backend/app/db/repositories/premium.py & HeartLink-mobile/services/premium.ts
const PRICING_DEFAULTS = {
  monthlyPhp: 99,
  yearlyPhp: 899,
  trialDays: 7,
};
const YEARLY_SAVINGS_PHP = PRICING_DEFAULTS.monthlyPhp * 12 - PRICING_DEFAULTS.yearlyPhp; // ₱289

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cal-ink";

const focusRingOnDark =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cal-on-dark";

const btnPrimary = `inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-cal-primary px-5 font-cal-sans text-[14px] font-semibold leading-none text-cal-on-primary no-underline active:bg-cal-primary-active ${focusRing}`;

const btnSecondary = `inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-5 font-cal-sans text-[14px] font-semibold leading-none text-cal-ink no-underline active:bg-cal-surface-soft ${focusRing}`;

const btnOnDark = `inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-cal-on-dark px-5 font-cal-sans text-[14px] font-semibold leading-none text-cal-ink no-underline active:bg-cal-surface-strong ${focusRingOnDark}`;

const FEATURES = [
  {
    icon: Activity,
    title: "Daily check-ins & 911 alerts",
    text: "Log blood pressure, pulse, medicine and symptoms. If a reading hits an emergency threshold, HeartLink warns you immediately with a Call 911 action.",
  },
  {
    icon: Utensils,
    title: "Meals & barcode scanner",
    text: "Scan packaged food barcodes or search meals to check sodium and sugar, with automatic warnings for your allergies and diet.",
  },
  {
    icon: Dumbbell,
    title: "Score-matched routines",
    text: "Browse clinician-checked recipes and exercises filtered by need—low-sodium, quick prep, seated movement, or guided breathing.",
  },
  {
    icon: SlidersHorizontal,
    title: "Personal targets & limits",
    text: "Set custom daily sodium, fluid intake, movement, and target blood pressure goals tailored to your routine.",
  },
  {
    icon: PhoneCall,
    title: "My Care Team speed-dial",
    text: "Keep your cardiologist, primary doctor, and family emergency contacts in one place to call or SMS in a single tap.",
  },
  {
    icon: FileText,
    title: "Doctor-ready PDF reports",
    text: "Generate a clean 1- or 3-month PDF summary of blood pressure, medication adherence, and habits to bring to your check-up.",
  },
  {
    icon: CloudOff,
    title: "Works offline + reminders",
    text: "Scheduled check-in nudges keep you consistent, and offline logs sync automatically once your phone reconnects.",
  },
  {
    icon: MapPin,
    title: "Nearby Cebu clinics",
    text: "Locate nearby clinics and hospitals around Cebu City on an interactive directory map whenever you need an in-person visit.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Set up your profile",
    text: "Answer a short health questionnaire with plain-language 'Why we ask' notes. HeartLink computes your starting Heart score from 37 inputs.",
    fragment: (
      <div className="mt-auto rounded-[8px] border border-cal-hairline bg-cal-canvas p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-cal-muted">Baseline questionnaire</span>
          <span className="font-cal-mono text-[12px] text-cal-ink">37 / 37 answered</span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-cal-hairline-soft">
          <div className="h-full w-full rounded-full bg-cal-ink" />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[13px]">
          <span className="font-semibold text-cal-ink">Starting Heart score</span>
          <span className="rounded-full bg-cal-surface-card px-2.5 py-0.5 font-cal-mono text-[12px] font-medium text-cal-ink">
            78 · Moderate
          </span>
        </div>
      </div>
    ),
  },
  {
    step: "02",
    title: "Check in each day",
    text: "Log your blood pressure, meals, exercise, sleep and medicine—even offline. Each habit moves your daily score up or down.",
    fragment: (
      <div className="mt-auto rounded-[8px] border border-cal-hairline bg-cal-canvas p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          {[
            { label: "BP", delta: "+2" },
            { label: "Meal", delta: "+1" },
            { label: "Move", delta: "+1" },
            { label: "Sleep", delta: "+1" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-[6px] bg-cal-surface-soft px-2.5 py-1.5"
            >
              <span className="font-medium text-cal-body">{item.label}</span>
              <span className="font-cal-mono text-cal-success">{item.delta}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    step: "03",
    title: "Bring clarity to check-ups",
    text: "Follow Today's note for daily adjustments, share scores with family, and bring your Trends or PDF summary to your doctor.",
    fragment: (
      <div className="mt-auto rounded-[8px] border border-cal-hairline bg-cal-canvas p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between text-[12px] font-medium text-cal-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cal-success" />
            Check-up summary
          </span>
          <span className="font-cal-mono text-cal-ink">PDF · 30d</span>
        </div>
        <p className="mt-1.5 mb-0 text-[13px] leading-[1.45] text-cal-body">
          Avg BP 119/77 mmHg · 92% medicine logs · 5 walks/wk.
        </p>
      </div>
    ),
  },
];

// Same bands as the app's score tag
const BANDS = [
  {
    range: "80–100",
    name: "Stable",
    text: "Keep up your daily habits.",
    dot: "bg-cal-success",
    pill: "Healthy rhythm",
  },
  {
    range: "60–79",
    name: "Moderate",
    text: "Small daily changes in salt, sleep or movement will help.",
    dot: "bg-cal-warning",
    pill: "Watch habits",
  },
  {
    range: "50–59",
    name: "Elevated risk",
    text: "Watch your readings closely and plan an in-person check-up.",
    dot: "bg-cal-badge-orange",
    pill: "Plan check-up",
  },
  {
    range: "01–49",
    name: "Critical",
    text: "See a doctor soon. In an emergency, call 911 right away.",
    dot: "bg-cal-error",
    pill: "Urgent care",
  },
];

const FAQS = [
  {
    question: "Is HeartLink a diagnostic medical device?",
    answer:
      "No. HeartLink is a supportive cardiovascular wellness tool built as an applied Capstone 2 project at Cebu Technological University – Main Campus. It summarizes what you log and never diagnoses or replaces a licensed physician. In an emergency, always call 911.",
  },
  {
    question: "Are safety features really free forever?",
    answer:
      "Yes. Daily check-ins, your Heart Stability Score (HSS), emergency blood-pressure and symptom warnings, nearby clinic lookup, Care Team speed-dial, barcode food scanning, and reminders stay free for every patient.",
  },
  {
    question: "How does HeartLink Premium billing work?",
    answer:
      "New patients can start a 7-day free trial inside the app. After that, Premium is ₱99 for 1 month or ₱899 for 1 year via GCash or card—paid once per period with zero automatic renewals. During capstone evaluation, checkout runs in test mode so no real money or payment details are collected.",
  },
  {
    question: "How does Family sharing work for loved ones?",
    answer:
      "A patient on Premium generates an invite code in Settings › Family Sharing. A spouse, child, or caregiver installs HeartLink for free, chooses a Family account, enters the code, and receives alerts if a reading reaches an emergency level.",
  },
  {
    question: "Are my health logs private and how are recommendations vetted?",
    answer:
      "Your logs are tied strictly to your authenticated account—never sold or exposed publicly. All recipes and exercise routines are audited before appearing in the app, and independent cardiologists, dietitians, and physical therapists review anonymized weekly samples to keep scoring calibrated.",
  },
  {
    question: "Why is HeartLink installed via an Android APK?",
    answer:
      "While HeartLink is in capstone rollout and not yet published on Google Play, Android 9+ users can install the signed APK directly from this page in three quick steps.",
  },
];

const HERO_TABS = [
  { id: "today", label: "Today" },
  { id: "trends", label: "7-day trends" },
  { id: "review", label: "Expert audit" },
];

const CARE_TEAM_AVATARS = [
  { initials: "CA", role: "Cardiologist", fill: "bg-cal-badge-orange" },
  { initials: "RD", role: "Dietitian", fill: "bg-cal-badge-emerald" },
  { initials: "PT", role: "Physical Therapist", fill: "bg-cal-badge-violet" },
  { initials: "AD", role: "Administrator", fill: "bg-cal-badge-pink" },
];

function DownloadCTA({ children, variant = "primary", className = "" }) {
  const link = APK_URL
    ? { href: APK_URL, target: "_blank", rel: "noopener noreferrer" }
    : { href: "#download" };
  const base =
    variant === "on-dark" ? btnOnDark : variant === "secondary" ? btnSecondary : btnPrimary;
  return (
    <a {...link} className={`${base} ${className}`}>
      <Download size={16} aria-hidden="true" />
      {children}
    </a>
  );
}

/**
 * Cal.com signature `hero-app-mockup-card` + `nav-pill-group`:
 * Embeds real HeartLink product UI chrome inside a 16px hairline card on white canvas.
 */
function HeroProductCard() {
  const [activeTab, setActiveTab] = useState("today");

  return (
    <div
      role="region"
      aria-label="Interactive HeartLink product preview"
      className="w-full rounded-[16px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] sm:p-6"
    >
      {/* Top bar with Cal.com signature nav-pill-group */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline-soft pb-4">
        <div className="flex items-center gap-2">
          <HeartLogoIcon size={22} />
          <span className="font-cal-display text-[15px] font-semibold tracking-[-0.3px] text-cal-ink">
            HeartLink
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Preview screen"
          className="inline-flex rounded-full bg-cal-surface-soft p-1.5"
        >
          {HERO_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`cursor-pointer rounded-[8px] border-0 px-3 py-1.5 font-cal-sans text-[13px] font-medium leading-[1.2] ${focusRing} ${
                  isActive
                    ? "bg-cal-canvas text-cal-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    : "bg-transparent text-cal-muted"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product UI fragment body */}
      {activeTab === "today" && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-cal-muted">Today · Morning check-in</div>
              <div className="mt-0.5 text-[18px] font-semibold text-cal-ink">Good morning, Ana</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
              <span className="h-2 w-2 rounded-full bg-cal-success" />
              Stable
            </span>
          </div>

          <div className="flex items-center gap-5 rounded-[12px] bg-cal-surface-card p-4">
            <div className="relative h-[108px] w-[108px] shrink-0">
              <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
                <circle
                  cx="54"
                  cy="54"
                  r="44"
                  fill="none"
                  className="stroke-cal-hairline"
                  strokeWidth="9"
                />
                <circle
                  cx="54"
                  cy="54"
                  r="44"
                  fill="none"
                  className="stroke-cal-ink"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="226 276"
                  transform="rotate(-90 54 54)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-cal-display text-[32px] font-semibold leading-none tracking-[-1px] text-cal-ink">
                  82
                </span>
                <span className="mt-1 text-[11px] font-medium text-cal-muted">Heart score</span>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="text-[14px] font-semibold text-cal-ink">Today&apos;s note</div>
              <p className="m-0 text-[13px] leading-[1.45] text-cal-body">
                Your <span className="font-cal-mono text-[12px] text-cal-ink">118/76</span> reading is in
                the healthy range. Keep it up with a short walk after lunch.
              </p>
              <span className="text-[12px] text-cal-muted-soft">
                A wellness guide, not a diagnosis.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "BP", val: "118/76" },
              { label: "Meal", val: "Logged" },
              { label: "Move", val: "25m" },
              { label: "Sleep", val: "7.5h" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-2 py-2.5"
              >
                <span className="text-[12px] font-semibold text-cal-ink">{item.label}</span>
                <span className="font-cal-mono text-[11px] text-cal-muted">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-cal-muted">Weekly stability window</div>
              <div className="mt-0.5 text-[18px] font-semibold text-cal-ink">Oct 23 – Oct 29</div>
            </div>
            <span className="rounded-full bg-cal-surface-card px-3 py-1 font-cal-mono text-[12px] font-medium text-cal-ink">
              Avg 81 · +4 pts
            </span>
          </div>

          <div className="rounded-[12px] bg-cal-surface-card p-4">
            <div className="grid h-[124px] grid-cols-7 items-end gap-2.5 pt-2">
              {[
                { day: "M", score: 76, h: "h-[68%]" },
                { day: "T", score: 78, h: "h-[72%]" },
                { day: "W", score: 79, h: "h-[75%]" },
                { day: "T", score: 81, h: "h-[80%]" },
                { day: "F", score: 80, h: "h-[78%]" },
                { day: "S", score: 83, h: "h-[86%]" },
                { day: "S", score: 82, h: "h-[84%]", today: true },
              ].map((bar, idx) => (
                <div key={`${bar.day}-${idx}`} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="font-cal-mono text-[11px] text-cal-muted">{bar.score}</span>
                  <div
                    className={`w-full rounded-[6px] ${bar.h} ${
                      bar.today ? "bg-cal-ink" : "bg-cal-surface-strong"
                    }`}
                  />
                  <span className="text-[11px] font-medium text-cal-muted">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[8px] border border-cal-hairline px-3.5 py-2.5 text-[13px]">
            <span className="text-cal-body">7 of 7 daily check-ins completed</span>
            <span className="font-semibold text-cal-ink">Ready for doctor visit</span>
          </div>
        </div>
      )}

      {activeTab === "review" && (
        <div className="mt-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-cal-muted">Weekly sample audit</div>
              <div className="mt-0.5 text-[18px] font-semibold text-cal-ink">Multi-clinician safety check</div>
            </div>
            <span className="rounded-full bg-cal-surface-card px-3 py-1 text-[12px] font-medium text-cal-ink">
              Portal view
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {[
              {
                initials: "CA",
                fill: "bg-cal-badge-orange",
                role: "Cardiologist",
                note: "Risk band & check-up flag verified",
              },
              {
                initials: "RD",
                fill: "bg-cal-badge-emerald",
                role: "Dietitian",
                note: "Low-sodium recipe match approved",
              },
              {
                initials: "PT",
                fill: "bg-cal-badge-violet",
                role: "Physical Therapist",
                note: "Brisk walk intensity safe for profile",
              },
            ].map((item) => (
              <div
                key={item.role}
                className="flex items-center gap-3 rounded-[10px] bg-cal-surface-card px-3.5 py-3"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-cal-ink ${item.fill}`}
                >
                  {item.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-cal-ink">{item.role}</div>
                  <div className="truncate text-[13px] text-cal-muted">{item.note}</div>
                </div>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cal-canvas text-cal-success">
                  <Check size={14} aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Cal.com `pricing-tier-card` + `pricing-tier-card-featured` (`#101010` dark card)
 * paired with a `nav-pill-group` Yearly / Monthly billing switcher.
 */
function PricingSection() {
  const [period, setPeriod] = useState("yearly");
  const isYearly = period === "yearly";

  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-y border-cal-hairline-soft bg-cal-surface-soft px-6 py-16 md:py-24"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[620px]">
            <span className="inline-block rounded-full bg-cal-canvas px-3 py-1 text-[13px] font-medium text-cal-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              Simple, transparent plans
            </span>
            <h2 className="mt-4 mb-0 font-cal-display text-[28px] font-semibold leading-[1.1] tracking-[-1px] text-cal-ink sm:text-[38px] lg:text-[48px] lg:tracking-[-1.5px]">
              Safety stays free. Upgrade only for the longer view.
            </h2>
            <p className="mt-3 mb-0 text-[16px] leading-[1.5] text-cal-body">
              Every patient gets daily check-ins, emergency alerts, and their Heart score for ₱0.
              Premium adds multi-month reports and family sharing—paid once, never auto-renewed.
            </p>
          </div>

          {/* Cal.com signature `nav-pill-group` billing switcher */}
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex rounded-full border border-cal-hairline bg-cal-canvas p-1.5"
          >
            <button
              type="button"
              aria-pressed={isYearly}
              onClick={() => setPeriod("yearly")}
              className={`cursor-pointer rounded-full border-0 px-3.5 py-2 font-cal-sans text-[14px] font-medium leading-none ${focusRing} ${
                isYearly ? "bg-cal-primary text-cal-on-primary" : "bg-transparent text-cal-muted"
              }`}
            >
              Yearly · Save ₱{YEARLY_SAVINGS_PHP}
            </button>
            <button
              type="button"
              aria-pressed={!isYearly}
              onClick={() => setPeriod("monthly")}
              className={`cursor-pointer rounded-full border-0 px-3.5 py-2 font-cal-sans text-[14px] font-medium leading-none ${focusRing} ${
                !isYearly ? "bg-cal-primary text-cal-on-primary" : "bg-transparent text-cal-muted"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* 3-tier grid: Standard light, Featured dark (#101010), Standard light */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Tier 1: Patient Free (`pricing-tier-card`) */}
          <article className="flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-8 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 font-cal-sans text-[22px] font-semibold leading-[1.3] tracking-[-0.3px] text-cal-ink">
                  Core Wellness
                </h3>
                <span className="rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
                  Always free
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-cal-display text-[36px] font-semibold leading-[1.15] tracking-[-1px] text-cal-ink">
                  ₱0
                </span>
                <span className="text-[14px] text-cal-muted">forever</span>
              </div>

              <p className="mt-3 mb-0 text-[14px] leading-[1.5] text-cal-muted">
                Full daily heart tracking, personalized routines, and safety alerts for every adult.
              </p>

              <ul className="mt-6 mb-8 flex list-none flex-col gap-3 border-t border-cal-hairline-soft pt-6 p-0 text-[15px] text-cal-body">
                {[
                  "Daily BP, pulse, meal, move & sleep check-ins",
                  "Personal Heart Stability Score (HSS) + Today's note",
                  "Emergency warnings & one-tap Call 911",
                  "Meal barcode scanner & allergy warnings",
                  "Expert-approved recipes & exercises",
                  "7-day Trends, offline sync & Cebu clinic map",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check size={17} className="mt-0.5 shrink-0 text-cal-ink" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <DownloadCTA variant="secondary" className="w-full">
              Download free APK
            </DownloadCTA>
          </article>

          {/* Tier 2: HeartLink Premium (`pricing-tier-card-featured`: #101010 dark card) */}
          <article className="flex flex-col justify-between rounded-[12px] bg-cal-surface-dark p-8 text-cal-on-dark">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 font-cal-sans text-[22px] font-semibold leading-[1.3] tracking-[-0.3px] text-cal-on-dark">
                  HeartLink Premium
                </h3>
                <span className="rounded-full bg-cal-surface-dark-elevated px-3 py-1 text-[13px] font-medium text-cal-on-dark">
                  {PRICING_DEFAULTS.trialDays}-day free trial
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-cal-display text-[36px] font-semibold leading-[1.15] tracking-[-1px] text-cal-on-dark">
                  ₱{isYearly ? PRICING_DEFAULTS.yearlyPhp : PRICING_DEFAULTS.monthlyPhp}
                </span>
                <span className="text-[14px] text-cal-on-dark-soft">
                  {isYearly ? "/ year (one-time)" : "/ month (one-time)"}
                </span>
              </div>

              <p className="mt-3 mb-0 text-[14px] leading-[1.5] text-cal-on-dark-soft">
                {isYearly
                  ? `Works out to ~₱${Math.round(PRICING_DEFAULTS.yearlyPhp / 12)}/mo—save ₱${YEARLY_SAVINGS_PHP} vs paying monthly.`
                  : "Pay once for 30 days via GCash or card—never auto-renews."}
              </p>

              <ul className="mt-6 mb-8 flex list-none flex-col gap-3 border-t border-cal-surface-dark-elevated pt-6 p-0 text-[15px] text-cal-on-dark">
                {[
                  "Everything in Core Wellness",
                  "1- and 3-month doctor-ready PDF health reports",
                  "90-day & 1-year Trends + month-over-month view",
                  "Time-of-day blood pressure pattern breakdown",
                  "Family sharing invite codes with emergency alerts",
                  "One-time GCash or card pass—no surprise renewals",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check size={17} className="mt-0.5 shrink-0 text-cal-success" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2.5">
              <DownloadCTA variant="on-dark" className="w-full">
                Start {PRICING_DEFAULTS.trialDays}-day trial in app
              </DownloadCTA>
              <span className="text-center text-[12px] text-cal-on-dark-soft">
                Academic test mode: ₱0 real money charged during capstone demo
              </span>
            </div>
          </article>

          {/* Tier 3: Family Follower (`pricing-tier-card`) */}
          <article className="flex flex-col justify-between rounded-[12px] border border-cal-hairline bg-cal-canvas p-8 shadow-[0_1px_2px_rgba(0,0,0,0.05)] md:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 font-cal-sans text-[22px] font-semibold leading-[1.3] tracking-[-0.3px] text-cal-ink">
                  Family Companion
                </h3>
                <span className="rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
                  With invite code
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-cal-display text-[36px] font-semibold leading-[1.15] tracking-[-1px] text-cal-ink">
                  ₱0
                </span>
                <span className="text-[14px] text-cal-muted">for invited family</span>
              </div>

              <p className="mt-3 mb-0 text-[14px] leading-[1.5] text-cal-muted">
                For spouses, adult children, or caregivers following a loved one on Premium.
              </p>

              <ul className="mt-6 mb-8 flex list-none flex-col gap-3 border-t border-cal-hairline-soft pt-6 p-0 text-[15px] text-cal-body">
                {[
                  "Dedicated Family home screen—no daily logging required",
                  "Follow a loved one's latest Heart score & BP check-ins",
                  "Instant alert if a logged reading hits an emergency level",
                  "Patient stays in control and can revoke access anytime",
                  "Switch to tracking your own heart health in one tap",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <HeartHandshake
                      size={17}
                      className="mt-0.5 shrink-0 text-cal-ink"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <DownloadCTA variant="secondary" className="w-full">
              Install for Family
            </DownloadCTA>
          </article>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-cal-canvas px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-3.5 lg:col-span-5">
          <span className="inline-block w-fit rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
            FAQ
          </span>
          <h2 className="m-0 font-cal-display text-[28px] font-semibold leading-[1.1] tracking-[-1px] text-cal-ink sm:text-[38px] lg:text-[48px] lg:tracking-[-1.5px]">
            Common questions before you install
          </h2>
          <p className="m-0 text-[16px] leading-[1.5] text-cal-body">
            Clear answers on clinical safety, privacy, Android APK setup, and how Free and Premium
            work.
          </p>
        </div>

        <div className="divide-y divide-cal-hairline rounded-[12px] border border-cal-hairline bg-cal-canvas px-6 lg:col-span-7">
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.question} className="py-5">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent p-0 text-left font-cal-sans text-[16px] font-semibold leading-[1.4] text-cal-ink ${focusRing}`}
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 text-cal-muted transition-transform duration-150 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 mb-0 pr-6 text-[15px] leading-[1.55] text-cal-body">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItemClass = `rounded-[6px] px-3 py-1.5 font-cal-sans text-[14px] font-medium leading-[1.4] text-cal-body no-underline ${focusRing}`;

  return (
    <div className="min-h-screen scroll-smooth bg-cal-canvas font-cal-sans text-cal-ink selection:bg-cal-ink selection:text-cal-on-primary">
      {/* ─── Top Navigation (`top-nav`: 64px white bar) ─── */}
      <header className="sticky top-0 z-40 border-b border-cal-hairline-soft bg-cal-canvas">
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6"
        >
          <a
            href="#top"
            className={`flex items-center gap-2.5 rounded-[6px] text-cal-ink no-underline ${focusRing}`}
          >
            <HeartLogoIcon size={28} />
            <span className="font-cal-display text-[20px] font-semibold tracking-[-0.5px] text-cal-ink">
              HeartLink
            </span>
          </a>

          {/* Center nav links (tablet/desktop) */}
          <div className="hidden items-center gap-1 md:flex">
            <a href="#how" className={navItemClass}>
              How it works
            </a>
            <a href="#features" className={navItemClass}>
              Features
            </a>
            <a href="#score" className={navItemClass}>
              Heart score
            </a>
            <a href="#pricing" className={navItemClass}>
              Pricing
            </a>
            <a href="#faq" className={navItemClass}>
              FAQ
            </a>
          </div>

          {/* Right action cluster */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className={`inline-flex h-10 items-center rounded-[8px] px-3 text-[14px] font-semibold leading-none text-cal-ink no-underline ${focusRing}`}
            >
              Staff sign in
            </Link>
            <DownloadCTA>Download APK</DownloadCTA>
          </div>

          {/* Mobile menu button (< 768px) */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-ink md:hidden ${focusRing}`}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {/* Mobile sheet (< 768px) */}
        {mobileMenuOpen && (
          <div className="border-t border-cal-hairline bg-cal-canvas px-6 py-5 md:hidden">
            <div className="flex flex-col gap-3">
              {[
                { href: "#how", label: "How it works" },
                { href: "#features", label: "Features" },
                { href: "#score", label: "Heart score" },
                { href: "#pricing", label: "Pricing" },
                { href: "#faq", label: "FAQ" },
                { href: "#download", label: "Download" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 text-[16px] font-medium text-cal-ink no-underline"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2.5 border-t border-cal-hairline-soft pt-4">
                <DownloadCTA className="w-full">Download for Android</DownloadCTA>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${btnSecondary} w-full`}
                >
                  Staff sign in
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ─── Band 1: Hero (`hero-band` — white canvas, 7/5 split, 96px rhythm) ─── */}
        <section id="top" className="scroll-mt-20 bg-cal-canvas px-6 py-16 md:py-24">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="flex flex-col items-start gap-6 lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium leading-[1.4] text-cal-ink">
                <span className="h-2 w-2 rounded-full bg-cal-success" />
                Heart wellness companion · Cebu City
              </span>

              <h1 className="m-0 font-cal-display text-[32px] font-semibold leading-[1.05] tracking-[-1px] text-cal-ink sm:text-[48px] lg:text-[64px] lg:tracking-[-2px]">
                Check in with your heart every day, in a few taps.
              </h1>

              <p className="m-0 max-w-[560px] text-[16px] font-normal leading-[1.5] text-cal-body sm:text-[18px]">
                HeartLink turns your blood pressure, meals, exercise and sleep into one daily Heart
                score, then tells you what changed and what to do next.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <DownloadCTA>Download for Android</DownloadCTA>
                <a href="#pricing" className={btnSecondary}>
                  Compare Free &amp; Premium
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>

              <p className="m-0 text-[13px] font-medium leading-[1.4] text-cal-muted-soft">
                Free core safety features · Android 9 or newer · installed via APK, not yet on Google Play
              </p>
            </div>

            <div className="lg:col-span-5">
              <HeroProductCard />
            </div>
          </div>
        </section>

        {/* ─── Band 2: How It Works (3-up `feature-card` in `#f5f5f5` with UI fragments) ─── */}
        <section
          id="how"
          className="scroll-mt-20 border-t border-cal-hairline-soft bg-cal-canvas px-6 py-16 md:py-24"
        >
          <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
            <div className="max-w-[640px]">
              <span className="inline-block rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
                How it works
              </span>
              <h2 className="mt-4 mb-0 font-cal-display text-[28px] font-semibold leading-[1.1] tracking-[-1px] text-cal-ink sm:text-[38px] lg:text-[48px] lg:tracking-[-1.5px]">
                Three simple habits between doctor visits
              </h2>
              <p className="mt-3 mb-0 text-[16px] leading-[1.5] text-cal-body">
                No complicated charts to decode—just a clear baseline, quick daily logs, and
                plain-language guidance you can bring to your physician.
              </p>
            </div>

            <ol className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-4 rounded-[12px] bg-cal-surface-card p-8"
                >
                  <span className="inline-flex h-8 w-fit items-center rounded-[6px] bg-cal-canvas px-2.5 font-cal-mono text-[13px] font-medium text-cal-ink">
                    Step {item.step}
                  </span>
                  <h3 className="m-0 font-cal-sans text-[18px] font-semibold leading-[1.4] text-cal-ink">
                    {item.title}
                  </h3>
                  <p className="m-0 text-[16px] font-normal leading-[1.5] text-cal-body">{item.text}</p>
                  {item.fragment}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── Band 3: Features (`surface-soft` floor + 4-up white `feature-icon-card`) ─── */}
        <section
          id="features"
          className="scroll-mt-20 border-y border-cal-hairline-soft bg-cal-surface-soft px-6 py-16 md:py-24"
        >
          <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
            <div className="max-w-[640px]">
              <span className="inline-block rounded-full bg-cal-canvas px-3 py-1 text-[13px] font-medium text-cal-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                Capabilities
              </span>
              <h2 className="mt-4 mb-0 font-cal-display text-[28px] font-semibold leading-[1.1] tracking-[-1px] text-cal-ink sm:text-[38px] lg:text-[48px] lg:tracking-[-1.5px]">
                Everything built into HeartLink
              </h2>
              <p className="mt-3 mb-0 text-[16px] leading-[1.5] text-cal-body">
                Designed for adults and families in Cebu City who want steady daily heart support
                between clinical check-ups.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="flex flex-col gap-3 rounded-[12px] border border-cal-hairline bg-cal-canvas p-6"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-cal-surface-card text-cal-ink">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="m-0 font-cal-sans text-[16px] font-semibold leading-[1.4] text-cal-ink">
                    {title}
                  </h3>
                  <p className="m-0 text-[14px] font-normal leading-[1.5] text-cal-body">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Band 4: Heart Score + Clinical Governance (`cal-canvas` + `product-mockup-card`) ─── */}
        <section id="score" className="scroll-mt-20 bg-cal-canvas px-6 py-16 md:py-24">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-12 lg:grid-cols-12">
            <div className="flex flex-col gap-4 lg:col-span-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
                <ShieldCheck size={15} aria-hidden="true" />
                NHANES 2017–2018 · 5,569 adults
              </span>
              <h2 className="m-0 font-cal-display text-[28px] font-semibold leading-[1.1] tracking-[-1px] text-cal-ink sm:text-[38px] lg:text-[48px] lg:tracking-[-1.5px]">
                What your Heart score means
              </h2>
              <p className="m-0 text-[16px] leading-[1.5] text-cal-body">
                Your starting score comes from a logistic-regression baseline trained on health
                survey data from 5,569 adults (NHANES 2017–2018). After that, guideline-based blood
                pressure rules and daily habits move it.
              </p>
              <div className="rounded-[12px] bg-cal-surface-card p-5">
                <div className="text-[14px] font-semibold text-cal-ink">
                  Audited by three clinical specialties
                </div>
                <p className="mt-1.5 mb-0 text-[14px] leading-[1.5] text-cal-body">
                  Independent cardiologists verify risk flags, dietitians audit recipes, and physical
                  therapists review exercise safety on weekly anonymized samples.
                </p>
                <p className="mt-2.5 mb-0 text-[13px] text-cal-muted">
                  The Heart score is a wellness guide, not a diagnosis. Always talk to your doctor
                  about your readings.
                </p>
              </div>
            </div>

            <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:col-span-7">
              <div className="mb-4 flex items-center justify-between border-b border-cal-hairline-soft pb-3">
                <span className="text-[14px] font-semibold text-cal-ink">
                  Heart Stability Score (HSS) bands
                </span>
                <span className="font-cal-mono text-[12px] text-cal-muted">Scale 01–100</span>
              </div>

              <ul
                aria-label="Heart score levels"
                className="m-0 flex list-none flex-col divide-y divide-cal-hairline-soft p-0"
              >
                {BANDS.map((band) => (
                  <li
                    key={band.name}
                    className="flex flex-wrap items-center gap-4 py-4 first:pt-1 last:pb-1"
                  >
                    <span className="w-[84px] shrink-0 font-cal-mono text-[16px] font-medium text-cal-ink">
                      {band.range}
                    </span>
                    <div className="min-w-[180px] flex-1">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${band.dot}`} />
                        <strong className="text-[16px] font-semibold text-cal-ink">
                          {band.name}
                        </strong>
                      </div>
                      <p className="mt-0.5 mb-0 text-[14px] leading-[1.45] text-cal-muted">
                        {band.text}
                      </p>
                    </div>
                    <span className="rounded-full bg-cal-surface-card px-3 py-1 text-[13px] font-medium text-cal-ink">
                      {band.pill}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─── Band 5: Pricing (`surface-soft` floor + Featured `#101010` Dark Tier) ─── */}
        <PricingSection />

        {/* ─── Band 6: FAQ (`cal-canvas` accordion) ─── */}
        <FaqSection />

        {/* ─── Band 7: Pre-Footer CTA (`cta-band-light` `#f5f5f5`) + Care Team Portal Row ─── */}
        <section id="download" className="scroll-mt-20 bg-cal-canvas px-6 pb-20 md:pb-24">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
            {/* Cal.com `cta-band-light`: #f5f5f5, 12px radius, 48px padding */}
            <div className="grid grid-cols-1 items-center gap-10 rounded-[12px] bg-cal-surface-card p-8 md:p-12 lg:grid-cols-12">
              <div className="flex flex-col items-start gap-4 lg:col-span-6">
                <span className="rounded-full bg-cal-canvas px-3 py-1 text-[13px] font-medium text-cal-ink">
                  Android APK · Free download
                </span>
                <h2 className="m-0 font-cal-display text-[26px] font-semibold leading-[1.2] tracking-[-0.5px] text-cal-ink sm:text-[32px]">
                  Get HeartLink for Android
                </h2>
                <p className="m-0 text-[16px] leading-[1.5] text-cal-body">
                  HeartLink is not on Google Play yet. Download the APK file directly and install it
                  on your phone in under a minute—for yourself or as a Family follower.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {APK_URL ? (
                    <DownloadCTA>Download the APK</DownloadCTA>
                  ) : (
                    <span className="inline-flex h-10 items-center rounded-[8px] bg-cal-primary-disabled px-4 text-[14px] font-semibold text-cal-muted">
                      The download link is coming soon
                    </span>
                  )}
                  <span className="text-[13px] font-medium text-cal-muted">Android 9 or newer</span>
                </div>
              </div>

              <ol className="m-0 flex list-none flex-col gap-3 p-0 lg:col-span-6">
                {[
                  "Tap Download the APK and open the file when it finishes.",
                  "If your phone asks, allow installs from this source.",
                  "Open HeartLink, choose Patient or Family account, and finish setup.",
                ].map((text, i) => (
                  <li
                    key={text}
                    className="flex items-center gap-3.5 rounded-[10px] border border-cal-hairline bg-cal-canvas px-4 py-3.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-cal-surface-card font-cal-mono text-[13px] font-medium text-cal-ink">
                      {i + 1}
                    </span>
                    <span className="text-[14px] leading-[1.5] text-cal-body">{text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Staff & Medical Experts Strip with Cal.com 36px pastel `avatar-circle` tokens */}
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex -space-x-2" aria-hidden="true">
                  {CARE_TEAM_AVATARS.map((member) => (
                    <span
                      key={member.initials}
                      title={member.role}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium text-cal-ink ring-2 ring-cal-canvas ${member.fill}`}
                    >
                      {member.initials}
                    </span>
                  ))}
                </div>
                <div>
                  <h2 className="m-0 font-cal-sans text-[18px] font-semibold leading-[1.4] text-cal-ink">
                    For administrators and medical experts
                  </h2>
                  <p className="mt-1 mb-0 text-[14px] leading-[1.5] text-cal-muted">
                    Manage recipes, exercises and announcements, approve content and review cases in
                    the HeartLink portal.
                  </p>
                </div>
              </div>

              <Link to="/login" className={btnSecondary}>
                Staff sign in
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Band 8: Dark Footer (`footer`: `#101010` — closes the long-scroll page) ─── */}
      <footer className="bg-cal-surface-dark px-6 py-16 text-cal-on-dark-soft">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <HeartLogoIcon size={26} />
                <span className="font-cal-display text-[19px] font-semibold tracking-[-0.4px] text-cal-on-dark">
                  HeartLink
                </span>
              </div>
              <p className="m-0 max-w-[520px] text-[14px] leading-[1.55] text-cal-on-dark-soft">
                HeartLink is a wellness app made for a Cebu Technological University capstone
                project. It is not a medical device and does not diagnose or treat any condition. In
                an emergency, call 911. Clinic locations come from a public map directory; HeartLink
                has no partnership with any clinic.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 text-[14px]">
              <span className="font-semibold text-cal-on-dark">Product</span>
              <a href="#how" className="w-fit text-cal-on-dark-soft no-underline">
                How it works
              </a>
              <a href="#features" className="w-fit text-cal-on-dark-soft no-underline">
                Features
              </a>
              <a href="#score" className="w-fit text-cal-on-dark-soft no-underline">
                Heart score
              </a>
              <a href="#pricing" className="w-fit text-cal-on-dark-soft no-underline">
                Pricing
              </a>
              <a href="#faq" className="w-fit text-cal-on-dark-soft no-underline">
                FAQ
              </a>
              <a href="#download" className="w-fit text-cal-on-dark-soft no-underline">
                Android APK
              </a>
            </div>

            <div className="flex flex-col gap-2.5 text-[14px]">
              <span className="font-semibold text-cal-on-dark">Clinical &amp; Admin</span>
              <Link to="/login" className="w-fit text-cal-on-dark-soft no-underline">
                Staff sign in
              </Link>
              <span className="text-cal-on-dark-soft">CTU Main · Capstone 2</span>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-cal-surface-dark-elevated pt-6 text-[13px] text-cal-muted-soft">
            <span>© 2026 HeartLink</span>
            <span>Wellness support tool · Not a diagnostic medical device</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
