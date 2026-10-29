import { Link } from "react-router-dom";
import { Activity, Bell, ChartLine, CloudOff, Download, Dumbbell, MapPin, Users, Utensils } from "lucide-react";
import { HeartLogoIcon } from "../auth/login";

// The public home page of the portal: what the app does and where to get it. Staff sign in at /login.
// The APK link lives in VITE_APK_URL (set it on Vercel); until then the download buttons jump to the download section.
const APK_URL = import.meta.env.VITE_APK_URL || "";

const focusRing = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ds-line";

const FEATURES = [
  {
    icon: Activity,
    tint: "bg-ds-rose",
    title: "Daily check-ins",
    text: "Log blood pressure, pulse and how you feel. If a reading or symptom is at an emergency level, the app tells you right away and shows Call 911.",
  },
  {
    icon: Utensils,
    tint: "bg-ds-peach",
    title: "Meals and barcode scan",
    text: "Scan a barcode or search a food to see its sodium and sugar. You get a warning when a food or recipe clashes with your allergies or diet.",
  },
  {
    icon: Dumbbell,
    tint: "bg-ds-mint",
    title: "Expert-approved recipes and exercises",
    text: "Heart-friendly recipes and exercise routines are checked by medical experts before they appear in the app.",
  },
  {
    icon: ChartLine,
    tint: "bg-ds-sky",
    title: "Trends",
    text: "See each day's score range, your habits over the week, and highlights once you have logged for seven days.",
  },
  {
    icon: CloudOff,
    tint: "bg-ds-lavender",
    title: "Works without signal",
    text: "No connection? Your logs are kept on the phone and sent as soon as you are back online.",
  },
  {
    icon: MapPin,
    tint: "bg-ds-yellow",
    title: "Nearby clinics",
    text: "Find clinics and hospitals near you on a map, with a Call 911 button close at hand.",
  },
  {
    icon: Users,
    tint: "bg-ds-surface",
    title: "Family sharing",
    text: "Invite a family member to follow your scores and get an alert when something needs attention. Part of Premium.",
  },
  {
    icon: Bell,
    tint: "bg-ds-surface",
    title: "Reminders",
    text: "Get a nudge when it's time to check in or log your day.",
  },
];

const STEPS = [
  {
    title: "Set up your profile",
    text: "Answer a short health questionnaire. HeartLink gives you a starting Heart score from your answers.",
  },
  {
    title: "Check in each day",
    text: "Log your blood pressure, meals, exercise, sleep and medicine. Each one moves your score up or down.",
  },
  {
    title: "Follow your next step",
    text: "Today's note tells you what changed and what to do next. Bring your Trends to your next doctor visit.",
  },
];

// Same bands as the app's score tag
const BANDS = [
  { range: "80+", name: "Stable", text: "Keep up your habits.", rangeColor: "text-ds-primary-pressed", dot: "bg-ds-primary" },
  { range: "60–79", name: "Moderate", text: "Small changes will help.", rangeColor: "text-[#8a5a00]", dot: "bg-[#e0a100]" },
  {
    range: "50–59",
    name: "Elevated risk",
    text: "Watch your readings and plan a check-up.",
    rangeColor: "text-[#a14a00]",
    dot: "bg-[#e8700c]",
  },
  {
    range: "Below 50",
    name: "Critical",
    text: "See a doctor soon. In an emergency, call 911.",
    rangeColor: "text-[#b42323]",
    dot: "bg-ds-danger",
  },
];

function DownloadButton({ children }) {
  const link = APK_URL ? { href: APK_URL, target: "_blank", rel: "noopener noreferrer" } : { href: "#download" };
  return (
    <a
      {...link}
      className={`inline-flex min-h-12 items-center gap-2.5 rounded-[8px] bg-ds-primary px-[22px] text-[16px] font-semibold text-white no-underline transition-colors hover:bg-ds-primary-pressed ${focusRing}`}
    >
      <Download size={20} aria-hidden="true" />
      {children}
    </a>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="m-0 text-[clamp(28px,3.4vw,40px)] leading-[1.15] font-bold tracking-[-0.02em]">{children}</h2>
  );
}

// A picture of the app's Today screen, drawn in markup so it stays sharp
function PhonePreview() {
  return (
    <div
      role="img"
      aria-label="The HeartLink Today screen showing a Heart score of 82, Stable"
      className="h-[560px] w-[300px] rounded-t-[40px] bg-[#1f2a44] px-3 pt-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="flex h-full flex-col gap-3.5 rounded-t-[30px] bg-ds-surface px-[18px] pt-[22px] text-ds-ink">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-ds-slate">Today</div>
            <div className="text-[18px] font-bold">Good morning, Ana</div>
          </div>
          <HeartLogoIcon size={28} />
        </div>
        <div className="flex flex-col items-center gap-2 rounded-[12px] border border-ds-hairline bg-white p-4">
          <div className="relative h-[132px] w-[132px]">
            <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
              <circle cx="66" cy="66" r="54" fill="none" stroke="#dcecfa" strokeWidth="12" />
              <circle
                cx="66"
                cy="66"
                r="54"
                fill="none"
                stroke="#1478b8"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="278 340"
                transform="rotate(-90 66 66)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[38px] leading-none font-bold">82</span>
              <span className="text-[11px] text-ds-slate">Heart score</span>
            </div>
          </div>
          <span className="rounded-full bg-ds-tint px-2.5 py-0.5 text-[12px] font-semibold text-ds-primary-pressed">
            Stable
          </span>
          <span className="text-center text-[10.5px] text-ds-slate">A wellness guide, not a diagnosis.</span>
        </div>
        <div className="rounded-[12px] border border-ds-hairline bg-white px-3.5 py-3">
          <div className="mb-0.5 text-[12px] font-bold">Today's note</div>
          <div className="text-[12px] text-ds-charcoal">
            Your 118/76 reading is in the healthy range. Keep it up with a short walk after lunch.
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
          <div className="rounded-[8px] bg-ds-rose py-2.5">BP</div>
          <div className="rounded-[8px] bg-ds-peach py-2.5">Meal</div>
          <div className="rounded-[8px] bg-ds-mint py-2.5">Move</div>
          <div className="rounded-[8px] bg-ds-lavender py-2.5">Sleep</div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navLink = `rounded-[4px] text-ds-tint no-underline hover:text-white ${focusRing}`;
  return (
    <div className="min-h-screen bg-ds-canvas text-ds-ink" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="bg-ds-navy text-white">
        <nav aria-label="Main" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4">
          <a href="#top" className={`mr-auto flex items-center gap-2.5 rounded-[4px] text-white no-underline ${focusRing}`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-white">
              <HeartLogoIcon size={28} />
            </span>
            <span className="text-[20px] font-bold tracking-[-0.01em]">HeartLink</span>
          </a>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
            <a href="#features" className={navLink}>Features</a>
            <a href="#how" className={navLink}>How it works</a>
            <a href="#score" className={navLink}>Heart score</a>
            <Link to="/login" className={`rounded-[4px] font-semibold text-white no-underline ${focusRing}`}>
              Staff sign in
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section id="top" className="overflow-hidden bg-ds-navy px-6 pt-14 text-white">
          <div className="mx-auto flex max-w-[860px] flex-col items-center gap-5 text-center">
            <h1 className="m-0 text-[clamp(36px,5.4vw,64px)] leading-[1.08] font-bold tracking-[-0.03em]">
              Check in with your heart every day, in a few taps.
            </h1>
            <p className="m-0 max-w-[640px] text-[19px] text-[#c9d6ea]">
              HeartLink turns your blood pressure, meals, exercise and sleep into one daily Heart score, then tells
              you what changed and what to do next.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <DownloadButton>Download for Android</DownloadButton>
              <a
                href="#how"
                className={`inline-flex min-h-12 items-center rounded-[8px] border border-white/45 px-[22px] text-[16px] font-semibold text-white no-underline hover:bg-white/10 ${focusRing}`}
              >
                See how it works
              </a>
            </div>
            <p className="m-0 text-[14px] text-[#9fb0c8]">
              Free · Android 9 or newer · installed from an APK file, not yet on Google Play
            </p>
          </div>
          <div className="mt-12 flex justify-center">
            <PhonePreview />
          </div>
        </section>

        <section id="features" className="px-6 py-[88px]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
            <div className="max-w-[640px]">
              <SectionTitle>What you can do in the app</SectionTitle>
              <p className="mt-3 mb-0 text-[17px] text-ds-slate">
                Built for adults in Cebu City who want to keep an eye on their heart health between doctor visits.
              </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
              {FEATURES.map(({ icon: Icon, tint, title, text }) => (
                <article key={title} className={`flex flex-col gap-2.5 rounded-[12px] p-6 ${tint}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <h3 className="m-0 text-[18px] font-bold">{title}</h3>
                  <p className="m-0 text-[15px] text-ds-charcoal">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="bg-ds-surface px-6 py-[88px]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
            <SectionTitle>How it works</SectionTitle>
            <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 p-0">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-2.5 rounded-[12px] border border-ds-hairline bg-white p-7">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-ds-primary font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="m-0 text-[19px] font-bold">{step.title}</h3>
                  <p className="m-0 text-[15px] text-ds-charcoal">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="score" className="px-6 py-[88px]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-x-16 gap-y-10">
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
              <SectionTitle>What your Heart score means</SectionTitle>
              <p className="m-0 text-[17px] text-ds-charcoal">
                Your starting score comes from a model trained on health survey data from 5,569 adults (NHANES
                2017–2018). After that, your blood pressure readings and daily habits move it.
              </p>
              <p className="m-0 text-[15px] text-ds-slate">
                The Heart score is a wellness guide, not a diagnosis. Always talk to your doctor about your readings.
              </p>
            </div>
            <ul aria-label="Heart score levels" className="m-0 flex min-w-0 flex-[1_1_420px] list-none flex-col gap-2.5 p-0">
              {BANDS.map((band) => (
                <li key={band.name} className="flex items-center gap-4 rounded-[12px] border border-ds-hairline px-5 py-4">
                  <span className={`w-[96px] shrink-0 whitespace-nowrap text-[20px] font-bold ${band.rangeColor}`}>{band.range}</span>
                  <span className="flex flex-1 flex-col">
                    <strong className="text-[16px]">{band.name}</strong>
                    <span className="text-[14px] text-ds-slate">{band.text}</span>
                  </span>
                  <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${band.dot}`} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="download" className="px-6 pb-[88px]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-16 gap-y-8 rounded-[12px] bg-ds-navy p-[clamp(32px,5vw,64px)] text-white">
            <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
              <SectionTitle>Get HeartLink for Android</SectionTitle>
              <p className="m-0 text-[17px] text-[#c9d6ea]">
                HeartLink is not on Google Play yet. Download the APK file and install it on your phone.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {APK_URL ? (
                  <DownloadButton>Download the APK</DownloadButton>
                ) : (
                  <p className="m-0 rounded-[8px] bg-white/10 px-4 py-3 text-[15px]">The download link is coming soon.</p>
                )}
                <span className="text-[14px] text-[#9fb0c8]">Android 9 or newer</span>
              </div>
            </div>
            <ol className="m-0 flex min-w-0 flex-[1_1_340px] list-none flex-col gap-3 p-0">
              {[
                "Tap Download the APK and open the file when it finishes.",
                "If your phone asks, allow installs from this source.",
                "Open HeartLink, create your account and finish setup.",
              ].map((text, i) => (
                <li key={text} className="flex items-start gap-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-white/12 text-[14px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-[16px] text-[#e3eaf5]">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-6 pb-[72px]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[12px] border border-ds-hairline px-7 py-6">
            <div>
              <h2 className="m-0 mb-1 text-[18px] font-bold">For administrators and medical experts</h2>
              <p className="m-0 text-[15px] text-ds-slate">
                Manage recipes, exercises and announcements, approve content and review cases in the HeartLink portal.
              </p>
            </div>
            <Link
              to="/login"
              className={`inline-flex min-h-11 items-center rounded-[8px] border border-ds-primary px-[18px] text-[15px] font-semibold text-ds-primary no-underline hover:bg-ds-tint ${focusRing}`}
            >
              Staff sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ds-hairline bg-ds-surface px-6 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-12 gap-y-6">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <HeartLogoIcon size={28} />
              <span className="text-[17px] font-bold">HeartLink</span>
            </div>
            <p className="m-0 max-w-[620px] text-[14px] text-ds-slate">
              HeartLink is a wellness app made for a Cebu Technological University capstone project. It is not a
              medical device and does not diagnose or treat any condition. In an emergency, call 911. Clinic locations
              come from a public map directory; HeartLink has no partnership with any clinic.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-[14px]">
            <a href="#features" className={`rounded-[4px] text-ds-primary hover:underline ${focusRing}`}>Features</a>
            <a href="#download" className={`rounded-[4px] text-ds-primary hover:underline ${focusRing}`}>Download</a>
            <Link to="/login" className={`rounded-[4px] text-ds-primary hover:underline ${focusRing}`}>Staff sign in</Link>
          </div>
        </div>
        <p className="mx-auto mt-6 mb-0 max-w-[1200px] text-[13px] text-ds-slate">© 2026 HeartLink</p>
      </footer>
    </div>
  );
}
