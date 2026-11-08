import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Download,
  Dumbbell,
  Menu,
  ShieldCheck,
  Utensils,
  X,
} from "lucide-react";
import { HeartLogoIcon } from "../auth/login.jsx";
import { safeDownloadUrl } from "../../app/publicLinks.js";

const APK_URL = safeDownloadUrl(import.meta.env.VITE_APK_URL);
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cal-primary";
const primary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-cal-primary px-5 py-3 text-[14px] font-semibold text-cal-on-primary no-underline transition-colors hover:bg-cal-primary-active ${focus}`;
const secondary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-cal-hairline bg-cal-canvas px-5 py-3 text-[14px] font-semibold text-cal-ink no-underline transition-colors hover:bg-cal-surface-soft ${focus}`;
const navigation = [
  ["#features", "The everyday essentials"],
  ["#how", "How it fits"],
  ["#faq", "Questions"],
];
const features = [
  {
    icon: Utensils,
    title: "Make room for practical meals",
    text: "Recipes with ingredients, portions and preparation steps. Sodium and energy information belong beside a clear source and serving basis.",
  },
  {
    icon: Dumbbell,
    title: "Move with clear instructions",
    text: "Beginner routines with a complete movement timeline, equipment and setting. Content review checks the routine as written.",
  },
  {
    icon: ClipboardList,
    title: "Keep your own record",
    text: "A personal diary for meals, movement and everyday habits. Optional measurements remain your records, without a disease-risk grade.",
  },
];
const questions = [
  [
    "What is the General Wellness update?",
    "HeartLink is being refocused around everyday food and movement habits. The website and content-review workflows are being updated first. This page describes that direction; the new mobile experience is still in development.",
  ],
  [
    "Does HeartLink diagnose or monitor a medical condition?",
    "No. HeartLink does not diagnose, treat or predict disease, and it is not an emergency monitoring service. Content cannot determine whether a routine or meal is suitable for every person. Follow advice from your own qualified health professional.",
  ],
  [
    "Do I need a blood-pressure monitor?",
    "Personal measurements are optional in the General Wellness direction. Food and movement habits do not require owning a measurement device. Existing warning and help safeguards remain part of the measurement flows.",
  ],
  [
    "Who reviews the content?",
    "Admin creates recipes and routines. Dietitians review nutrition content and Physical Therapists review movement content before Admin publication. A review is a content-quality step, not a personal consultation or a guarantee of suitability.",
  ],
  [
    "What about Premium?",
    "Premium remains optional and secondary. Existing capstone evaluation checkout uses test mode. This website does not collect payment details or start a subscription.",
  ],
  [
    "When can I download the Android app?",
    APK_URL
      ? "An Android installation link is configured below. Check the release information supplied with the download before installing. The General Wellness update is still in development."
      : "There is no public Android download linked yet. A verified release destination and release information will be added here when available. You do not need to enable installation permissions now.",
  ],
  [
    "Where are the privacy and support details?",
    "Public release privacy, retention and support information is still being finalized. Those details need to be available before public downloads open. Do not send health logs, passwords or personal measurements through general feedback channels.",
  ],
];

function ProductPreview() {
  const [focusArea, setFocusArea] = useState("food");
  const food = focusArea === "food";
  return (
    <figure className="relative m-0 rounded-[24px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_16px_60px_rgba(20,120,184,0.08)] sm:p-7">
      <div className="flex items-center justify-between gap-4 border-b border-cal-hairline pb-5">
        <span className="flex items-center gap-2 font-semibold">
          <HeartLogoIcon size={23} /> Everyday, at your pace
        </span>
        <span className="rounded-full bg-cal-surface-soft px-2.5 py-1 text-[12px] text-cal-muted">
          Preview
        </span>
      </div>
      <p className="mt-6 text-[13px] font-medium text-cal-muted">
        Choose a focus
      </p>
      <div
        role="group"
        aria-label="Preview wellness focus"
        className="mt-3 flex flex-wrap gap-2"
      >
        {[
          ["food", "Eat with less sodium"],
          ["movement", "Move more regularly"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={focusArea === value}
            onClick={() => setFocusArea(value)}
            className={`min-h-11 rounded-full border px-4 text-[13px] font-medium transition-colors ${focus} ${focusArea === value ? "border-cal-primary bg-ds-sky text-ds-on-tint" : "border-cal-hairline bg-cal-canvas text-cal-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="mt-5 rounded-[20px] bg-cal-surface-soft p-5 sm:p-6"
        aria-live="polite"
      >
        <div
          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-[16px] ${food ? "bg-ds-mint" : "bg-ds-lavender"}`}
        >
          {food ? (
            <Utensils size={23} aria-hidden="true" />
          ) : (
            <Dumbbell size={23} aria-hidden="true" />
          )}
        </div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-cal-muted">
          {food ? "Recipe details" : "Routine details"}
        </p>
        <h3 className="text-[22px] font-semibold leading-snug tracking-[-0.4px]">
          {food
            ? "Know what goes into your meal"
            : "Know what the routine asks of you"}
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed text-cal-body">
          {food
            ? "Complete ingredients, clear portions and practical preparation steps, with nutrition shown on a stated basis."
            : "Instructions, repetitions or time, rest, equipment and setting kept together in one readable guide."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(food
            ? ["Ingredients", "Serving basis", "Preparation"]
            : ["Movement timeline", "Equipment", "Setting"]
          ).map((label) => (
            <span
              key={label}
              className="rounded-full bg-cal-canvas px-3 py-1.5 text-[12px] font-medium"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="mt-4 text-[12px] leading-relaxed text-cal-muted">
        Illustration of the planned experience, with no personal records. It is
        not a screenshot of a released mobile update.
      </figcaption>
    </figure>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [menuOpen]);
  return (
    <div className="min-h-screen bg-cal-surface-soft font-cal-sans text-cal-ink selection:bg-ds-sky">
      <a
        href="#main-content"
        className={`sr-only z-50 rounded-[8px] bg-cal-canvas p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 ${focus}`}
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-cal-hairline bg-cal-canvas">
        <div className="mx-auto flex min-h-[76px] max-w-[1200px] items-center justify-between gap-5 px-5 sm:px-8">
          <Link
            to="/"
            aria-label="HeartLink home"
            className={`flex items-center gap-2.5 text-[20px] font-semibold tracking-[-0.5px] text-cal-ink no-underline ${focus}`}
          >
            <HeartLogoIcon size={29} /> HeartLink
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {navigation.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className={`text-[14px] text-cal-body no-underline hover:text-cal-primary ${focus}`}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className={`hidden text-[13px] font-medium text-cal-muted no-underline sm:inline-flex ${focus}`}
            >
              Staff sign in
            </Link>
            <span className="hidden sm:block"><a href="#download" className={primary}>
              Android availability <ArrowRight size={15} aria-hidden="true" />
            </a></span>
            <button
              ref={menuButton}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              className={`flex h-11 w-11 items-center justify-center rounded-[12px] border border-cal-hairline lg:hidden ${focus}`}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="space-y-1 border-t border-cal-hairline px-5 py-4 lg:hidden"
          >
            {[...navigation, ["#download", "Android availability"]].map(
              ([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded-[8px] px-3 py-3 text-[14px] text-cal-ink no-underline ${focus}`}
                >
                  {label}
                </a>
              ),
            )}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-3 text-[14px] text-cal-muted ${focus}`}
            >
              Staff sign in
            </Link>
          </nav>
        )}
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3.5 py-2 text-[12px] font-medium text-cal-body">
              <span
                className="h-1.5 w-1.5 rounded-full bg-cal-primary"
                aria-hidden="true"
              />{" "}
              General Wellness update · In development
            </p>
            <h1 className="max-w-[12ch] text-[42px] font-semibold leading-[1.08] tracking-[-1.8px] sm:text-[58px]">
              Small habits.
              <br />A little more clarity.
            </h1>
            <p className="mt-6 max-w-[48ch] text-[17px] leading-[1.7] text-cal-body">
              Make food and movement easier to understand. HeartLink is being
              shaped around practical recipes, beginner routines and a personal
              record of your everyday habits.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#download" className={primary}>
                Check Android availability{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href="#features" className={secondary}>
                Explore the direction
              </a>
            </div>
            <p className="mt-5 max-w-[48ch] text-[13px] leading-relaxed text-cal-muted">
              For general wellness. No disease-risk score, diagnosis or
              emergency monitoring.
            </p>
          </div>
          <ProductPreview />
        </section>
        <section
          id="features"
          className="scroll-mt-24 border-y border-cal-hairline bg-cal-canvas px-5 py-16 sm:px-8 sm:py-20"
        >
          <div className="mx-auto max-w-[1136px]">
            <p className="text-[13px] font-semibold text-cal-primary">
              The everyday essentials
            </p>
            <h2 className="mt-3 max-w-[22ch] text-[30px] font-semibold leading-tight tracking-[-0.7px] sm:text-[38px]">
              Useful detail, without the noise.
            </h2>
            <p className="mt-4 max-w-[65ch] text-[16px] leading-relaxed text-cal-muted">
              The General Wellness direction keeps the focus on food, movement
              and your own records. Each part has a clear purpose.
            </p>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {features.map(({ icon: Icon, title, text }, index) => (
                <article
                  key={title}
                  className="border-t border-cal-hairline pt-6"
                >
                  <span
                    className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[16px] ${["bg-ds-mint", "bg-ds-lavender", "bg-ds-peach"][index]}`}
                  >
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <h3 className="text-[20px] font-semibold leading-snug">
                    {title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.7] text-cal-muted">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="how"
          className="mx-auto grid max-w-[1200px] scroll-mt-24 gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20"
        >
          <div>
            <p className="text-[13px] font-semibold text-cal-primary">
              How it fits
            </p>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.7px] sm:text-[38px]">
              Your focus.
              <br />
              Your own pace.
            </h2>
            <p className="mt-5 max-w-[40ch] text-[16px] leading-relaxed text-cal-muted">
              A useful routine should fit your day. The update is designed
              around practical preferences, clear information and optional
              personal tracking.
            </p>
          </div>
          <ol className="m-0 list-none space-y-7 p-0">
            {[
              [
                "Choose a wellness focus",
                "Eat with less sodium or move more regularly. A focus expresses what you want to work on; it does not assign a health category.",
              ],
              [
                "Look at the whole recipe or routine",
                "Check portions, ingredients, instructions and equipment before deciding what fits your day. General content does not replace personal professional advice.",
              ],
              [
                "Keep a record that is yours",
                "Log what you actually did. Missing entries stay missing, rather than becoming a score or a judgement.",
              ],
            ].map(([title, text], index) => (
              <li key={title} className="flex gap-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-[13px] font-semibold tabular-nums">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-[18px] font-semibold">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-cal-muted">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="bg-cal-canvas px-5 py-14 sm:px-8">
          <div className="mx-auto grid max-w-[1136px] gap-7 md:grid-cols-2">
            <div className="flex items-start gap-4 rounded-[20px] bg-ds-sky p-6">
              <ShieldCheck
                size={24}
                className="mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-[20px] font-semibold">
                  Content quality comes first
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-cal-body">
                  Admin authors. The relevant specialist reviews the saved
                  revision. Admin publishes after approval. Content review is
                  separate from personal medical care.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-[20px] bg-cal-surface-soft p-6">
              <BookOpen
                size={24}
                className="mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-[20px] font-semibold">
                  Premium stays optional
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-cal-muted">
                  Existing Premium features remain secondary. Capstone
                  evaluation checkout uses test mode; there is no checkout or
                  subscription sign-up on this page.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="faq"
          className="mx-auto max-w-[880px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20"
        >
          <h2 className="text-[30px] font-semibold tracking-[-0.7px] sm:text-[38px]">
            A few things to know.
          </h2>
          <div className="mt-8 divide-y divide-cal-hairline border-y border-cal-hairline">
            {questions.map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-5 text-[16px] font-semibold [&::-webkit-details-marker]:hidden ${focus}`}
                >
                  {question}
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 group-open:rotate-180"
                  />
                </summary>
                <p className="mt-4 pr-6 text-[15px] leading-[1.75] text-cal-muted">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>
        <section
          id="download"
          className="scroll-mt-24 px-5 pb-16 sm:px-8 sm:pb-20"
        >
          <div className="mx-auto max-w-[1136px] rounded-[24px] border border-cal-hairline bg-cal-canvas p-7 sm:p-12">
            <div className="max-w-[65ch]">
              <p className="text-[13px] font-semibold text-cal-primary">
                Android availability
              </p>
              <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.7px] sm:text-[36px]">
                {APK_URL
                  ? "Android installation link"
                  : "A little more work before download day."}
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-cal-muted">
                {APK_URL
                  ? "Use the configured destination for the installation file and its release information. The General Wellness update described here is still in development."
                  : "The General Wellness update is in development, and no verified public download is linked yet. Release, privacy and support information will be added here before downloads open."}
              </p>
              {APK_URL ? (
                <a
                  href={APK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-7 ${primary}`}
                >
                  <Download size={17} aria-hidden="true" /> Open Android
                  download
                </a>
              ) : (
                <p className="mt-7 inline-flex rounded-full bg-cal-surface-soft px-4 py-2 text-[13px] font-medium text-cal-body">
                  Android download not yet available
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-cal-hairline bg-cal-canvas px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-[1136px] flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-2 text-[17px] font-semibold">
            <HeartLogoIcon size={24} /> HeartLink
          </div>
          <p className="text-[13px] text-cal-muted">
            Everyday wellness · General Wellness update in development
          </p>
          <Link
            to="/login"
            className={`text-[13px] font-medium text-cal-muted underline-offset-4 ${focus}`}
          >
            Staff sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
