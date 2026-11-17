import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Download,
  Dumbbell,
  FileText,
  HeartPulse,
  Menu,
  Moon,
  Utensils,
  X,
} from "lucide-react";
import { HeartLogoIcon } from "../auth/login.jsx";
import { safeDownloadUrl } from "../../app/publicLinks.js";
import "./landing.css";

const APK_URL = safeDownloadUrl(import.meta.env.VITE_APK_URL);
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cal-primary";
const primary = `landing-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-cal-primary px-5 py-3 text-[14px] font-semibold text-cal-on-primary no-underline transition-colors hover:bg-cal-primary-active ${focus}`;
const secondary = `landing-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 py-3 text-[14px] font-semibold text-cal-ink no-underline transition-colors ${focus}`;
const navigation = [
  ["#features", "What you track"],
  ["#how", "How it works"],
  ["#faq", "Questions"],
];
const CONTENT_CHECK =
  "Explore recipes with ingredients, portions and preparation steps, alongside exercise routines with instructions, timing and equipment details.";
const PREMIUM =
  "HeartLink Premium adds 90-day and 1-year trend views, 1- and 3-month PDF summaries, family sharing, and weekly meal plans with shopping lists. Everyday logging and 7-day summaries remain free.";
const features = [
  {
    icon: HeartPulse,
    title: "Keep your readings together",
    text: "Save your readings and daily check-ins. Return to previous entries by date instead of relying on memory.",
  },
  {
    icon: Utensils,
    title: "Record everyday habits",
    text: "Keep meals, movement and sleep in the same place as your daily check-ins.",
  },
  {
    icon: Dumbbell,
    title: "Explore food and movement",
    text: "Find recipes with clear ingredients and preparation steps, plus exercise routines with easy-to-follow instructions.",
  },
  {
    icon: FileText,
    title: "Keep a summary on hand",
    text: "Turn your last 7 days of logged information into a PDF you can preview, save or share.",
  },
];
const questions = [
  [
    "What is HeartLink?",
    "HeartLink brings daily readings, meals, movement and sleep into one app. Keep your records organized, explore recipes and exercise routines, and review your entries over time.",
  ],
  [
    "How should I use the information in HeartLink?",
    "Use HeartLink to record and review your own information. Its content and summaries support personal tracking; they do not replace individual advice from a qualified professional.",
  ],
  [
    "What can I log?",
    "You can record your readings, meals, exercise and sleep. Browse previous entries to keep track of what you have logged.",
  ],
  [
    "Can I save or share my summaries?",
    "Yes. Preview your summary in the app and share it as a PDF. A 7-day summary is included for free; Premium adds 1- and 3-month summaries. Each summary reflects the information you have logged.",
  ],
  ["What is in the recipe and exercise libraries?", CONTENT_CHECK],
  ["What is included with Premium?", PREMIUM],
  [
    "When can I download the Android app?",
    APK_URL
      ? "An Android installation link is below. Check the release information that comes with the download before installing."
      : "There is no public Android download linked yet. A verified release destination and release information will be added here when available. You do not need to enable installation permissions now.",
  ],
  [
    "Can I choose who I share with?",
    "With Premium family sharing, you can invite someone you trust and remove their access in the app. Sharing is your choice.",
  ],
];

function ProductPreview() {
  const [focusArea, setFocusArea] = useState("food");
  const food = focusArea === "food";
  return (
    <figure className="landing-preview">
      <div className="landing-preview-heading">
        <span className="flex items-center gap-2 font-semibold">
          <HeartLogoIcon size={23} /> Inside HeartLink
        </span>
        <span className="landing-illustration-label">Illustration</span>
      </div>
      <div className="landing-preview-logs" aria-hidden="true">
        <span><HeartPulse size={20} /><span>Readings</span></span>
        <span><Utensils size={20} /><span>Meals</span></span>
        <span><Moon size={20} /><span>Sleep</span></span>
      </div>
      <div className="landing-preview-intro">
      <p className="text-[13px] font-medium text-cal-muted">Explore the content</p>
      <div
        role="group"
        aria-label="Preview content library"
        className="landing-preview-options mt-3 flex flex-wrap gap-2"
      >
        {[
          ["food", "Recipes"],
          ["movement", "Exercise routines"],
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
      <p className="landing-preview-context">Explore the details available in each library.</p>
      </div>
      <div
        className="landing-preview-details"
        aria-live="polite"
      >
        <div
          className={`landing-preview-topic ${food ? "bg-ds-mint" : "bg-ds-lavender"}`}
        >
          {food ? (
            <Utensils size={23} aria-hidden="true" />
          ) : (
            <Dumbbell size={23} aria-hidden="true" />
          )}
        </div>
        <p className="mb-2 text-[12px] font-medium text-cal-muted">
          {food ? "Recipe details" : "Routine details"}
        </p>
        <h2 className="text-[24px] font-semibold leading-snug tracking-[-0.4px]">
          {food
            ? "Know what goes into your meal"
            : "Know what the routine asks of you"}
        </h2>
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
              className="rounded-[6px] bg-cal-canvas px-3 py-1.5 text-[12px] font-medium"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="text-[11px] leading-relaxed text-cal-muted">
        An illustration of content details, not a live app screen or a person's records.
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
    <div className="landing-page min-h-screen font-cal-sans text-cal-ink selection:bg-ds-sky">
      <a
        href="#main-content"
        className={`sr-only z-50 rounded-[8px] bg-cal-canvas p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 ${focus}`}
      >
        Skip to content
      </a>
      <header className="landing-header sticky top-0 z-30">
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
              Sign in
            </Link>
            <span className="hidden sm:block"><a href="#download" className={secondary}>
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
              Sign in
            </Link>
          </nav>
        )}
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-update">
              <HeartPulse size={18} aria-hidden="true" /> Your everyday companion
            </p>
            <h1>
              Your daily <span className="whitespace-nowrap">check-ins,</span> brought together.
            </h1>
            <p className="landing-hero-description">
              Keep daily readings, meals, movement and sleep together.
              Explore recipes and routines, review your entries, and share a summary when you need one.
            </p>
            <div className="landing-hero-actions">
              <a href="#download" className={primary}>
                Check Android availability{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href="#features" className={secondary}>
                Explore HeartLink
              </a>
            </div>
            <p className="landing-hero-boundary">
              For personal tracking. Not a substitute for professional advice.
            </p>
          </div>
          <ProductPreview />
        </section>
        <section
          id="features"
          className="landing-features scroll-mt-24 border-y border-cal-hairline bg-cal-canvas px-5 py-16 sm:px-8 sm:py-20"
        >
          <div className="mx-auto max-w-[1136px]">
            <h2 className="max-w-[26ch] text-[30px] font-semibold leading-tight tracking-[-0.7px] sm:text-[38px]">
              Less to keep in your head.
            </h2>
            <p className="mt-4 max-w-[65ch] text-[16px] leading-relaxed text-cal-muted">
              From a quick check-in to your weekly routine, keep the details that matter to you in one place.
            </p>
            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }, index) => (
                <article
                  key={title}
                  className="border-t border-cal-hairline pt-6"
                >
                  <span
                    className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[12px] ${["bg-ds-sky", "bg-ds-mint", "bg-ds-lavender", "bg-ds-sky"][index]}`}
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
          className="landing-process mx-auto grid max-w-[1200px] scroll-mt-24 gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20"
        >
          <div>
            <p className="text-[13px] font-semibold text-cal-primary">
              How it works
            </p>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.7px] sm:text-[38px]">
              Start with what you know.
            </h2>
            <p className="mt-5 max-w-[40ch] text-[16px] leading-relaxed text-cal-muted">
              You don't have to remember every detail at once. Build your record with everyday check-ins, at your own pace.
            </p>
          </div>
          <ol className="m-0 list-none space-y-7 p-0">
            {[
              [
                "Answer a few setup questions",
                "Create your profile and add your starting information, so your records have a place of their own.",
              ],
              [
                "Log what you do",
                "Save readings, meals, movement and sleep as you go. Your entries become a record you can return to.",
              ],
              [
                "Review and share",
                "Look back at your entries and trends, or bring your logged information together in a shareable PDF.",
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
        <section className="landing-boundaries bg-cal-canvas px-5 py-14 sm:px-8" aria-labelledby="landing-boundaries-title">
          <div className="mx-auto max-w-[1136px]">
            <div className="landing-score-note">
              <div>
                <h2 id="landing-boundaries-title" className="text-[30px] font-semibold leading-tight tracking-[-0.7px] sm:text-[36px]">More ways to make HeartLink yours.</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-cal-body">Keep everyday logging free. Choose Premium for a longer view of your records, weekly planning and sharing with people you trust.</p>
              </div>
              <div className="landing-score-explanations">
                <div>
                  <h3 className="font-semibold">Longer trend views</h3>
                  <p>Look back over 90 days or a year and compare your logged information over time.</p>
                </div>
                <div>
                  <h3 className="font-semibold">Extended summaries</h3>
                  <p>Bring 1 or 3 months of entries into a PDF you can preview, save and share.</p>
                </div>
                <div>
                  <h3 className="font-semibold">Weekly meal plans</h3>
                  <p>Organize breakfast, lunch and dinner across 7 days, with recipes and a shopping list.</p>
                </div>
                <div>
                  <h3 className="font-semibold">Family sharing</h3>
                  <p>Invite someone you trust to view your shared information, with access you can remove in the app.</p>
                </div>
              </div>
            </div>
          <div className="landing-service-notes">
            <div className="flex items-start gap-4">
              <FileText
                size={24}
                className="mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-[20px] font-semibold">
                  Details before you start
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-cal-body">
                  {CONTENT_CHECK}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <BookOpen
                size={24}
                className="mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-[20px] font-semibold">
                  Find your Premium options
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-cal-muted">
                  Open Premium in the app to see the features and options available to your account. Your everyday logging stays free.
                </p>
              </div>
            </div>
          </div>
          </div>
        </section>
        <section
          id="faq"
          className="landing-faq mx-auto max-w-[1200px] scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20"
        >
          <div>
            <h2 className="text-[30px] font-semibold tracking-[-0.7px] sm:text-[38px]">A few things to know.</h2>
            <p className="mt-4 max-w-[30ch] text-[15px] leading-relaxed text-cal-muted">A few useful details about your records, content and Premium options.</p>
          </div>
          <div className="divide-y divide-cal-hairline border-y border-cal-hairline">
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
                  : "Android download is not available yet."}
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-cal-muted">
                {APK_URL
                  ? "Use this link for the installation file and its release information."
                  : "No verified public download is linked yet. Release, privacy and support information will be added here before downloads open."}
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
            HeartLink. Everyday records, brought together.
          </p>
          <Link
            to="/login"
            className={`text-[13px] font-medium text-cal-muted underline-offset-4 ${focus}`}
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
