/**
 * HeartLink's Terms of Service and Privacy Policy, shown inside the app (app/legal.tsx) so they work without a
 * website (2026-11-18). They describe what the app really does today; change them together with the app.
 * DRAFT: written by the team in plain English and pending the adviser's review. Not legal advice.
 */

export type LegalDocId = "terms" | "privacy" | "doctor";

export interface LegalSection {
  heading: string;
  /** Plain paragraphs. */
  paragraphs?: string[];
  /** A bulleted list, shown after the paragraphs. */
  bullets?: string[];
  /** Paragraphs shown after the list. */
  after?: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}


const UPDATED = "18 November 2026";

export const TERMS: LegalDoc = {
  title: "Terms of Service",
  updated: UPDATED,
  intro:
    "These terms explain what HeartLink is, what it isn't, and what we expect from you. By creating an account you agree to them.",
  sections: [
    {
      heading: "What HeartLink is",
      paragraphs: [
        "HeartLink is a heart-health tracking and prevention app for adults aged 18 and over. It was made by students of Cebu Technological University as a capstone project.",
        "It helps you log your blood pressure, meals, exercise and sleep, and turns them into an estimated heart risk, a habits score and suggestions. It is a wellness tool, not a medical device.",
      ],
    },
    {
      heading: "Not medical advice, and not for emergencies",
      paragraphs: [
        "HeartLink does not diagnose, treat or prescribe. Its heart risk is an estimate to discuss with your doctor, and its scores and suggestions are general guidance.",
        "Never start, stop or change a medicine because of the app. Talk to your doctor first.",
        "In an emergency, call 911 or go to the nearest emergency room. HeartLink's emergency screen is a precaution only: it doesn't call for help and nobody is watching your readings in real time.",
      ],
    },
    {
      heading: "Your account",
      bullets: [
        "You must be 18 or older.",
        "Give true information. The estimates are only as good as what you enter.",
        "Keep your password to yourself. You're responsible for what happens in your account.",
        "One account is for one person.",
      ],
    },
    {
      heading: "Exercise",
      paragraphs: [
        "Answer the PAR-Q+ safety check honestly. It decides which exercises the app offers.",
        "Stop right away if you have chest pain, feel dizzy or faint, or can't catch your breath, and get checked. You exercise at your own risk, and your doctor's advice comes first.",
      ],
    },
    {
      heading: "Food information",
      paragraphs: [
        "Nutrition values are estimates. Packaged foods come from Open Food Facts, a public database, so always check the package label.",
        "Allergy and diet warnings depend on what you told us and on each food's listed ingredients, so they can miss something.",
      ],
    },
    {
      heading: "Family sharing",
      paragraphs: [
        "With Premium you can let family members follow you. They see your blood pressure readings and weekly summaries and get alerts, including emergency-level ones. You choose who follows you and can stop sharing at any time.",
        "Family members are not emergency responders, and an alert can arrive late or not at all.",
      ],
    },
    {
      heading: "Premium",
      paragraphs: [
        "The Premium checkout is a demonstration for this study. No real payment is taken and no card details are collected. Premium features may change.",
      ],
    },
    {
      heading: "The care team",
      paragraphs: [
        "Recipes are approved by a Dietitian and exercises by a Physical Therapist before you see them. HeartLink's experts may review your records and anonymized cases to check the app's suggestions.",
        "Using HeartLink doesn't make any HeartLink expert your personal doctor.",
      ],
    },
    {
      heading: "Using HeartLink fairly",
      bullets: [
        "Don't use another person's account or enter their data without permission.",
        "Don't try to break into, overload or copy the app or its systems.",
        "Don't send abusive or false reports through feedback.",
      ],
    },
    {
      heading: "If the app is wrong or unavailable",
      paragraphs: [
        "HeartLink is a study project. We work to keep it accurate and running, but we can't promise it is error-free or always available.",
        "As far as the law allows, we aren't responsible for decisions you make based on the app. Health decisions belong to you and your doctor.",
      ],
    },
    {
      heading: "Closing your account",
      paragraphs: [
        "You can delete your account in Settings › Login and security. We may suspend an account that breaks these terms.",
      ],
    },
    {
      heading: "Changes and the law",
      paragraphs: [
        "When these terms change, the date at the top changes too. Using the app after that means you accept them.",
        "These terms follow the laws of the Philippines.",
      ],
    },
    {
      heading: "Contact us",
      paragraphs: ["Questions? Send them through Settings › Send feedback."],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  updated: UPDATED,
  intro:
    "This explains what HeartLink collects, why, who can see it, and your rights under the Philippine Data Privacy Act of 2012 (Republic Act 10173).",
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        "HeartLink is a capstone project of Cebu Technological University students. The HeartLink team decides how your information is used and is responsible for it.",
      ],
    },
    {
      heading: "What we collect",
      bullets: [
        "Account: your name, email address, mobile number and password. Your password is kept by our sign-in service, and the team can't see it.",
        "Profile: date of birth, sex, height and weight.",
        "Setup answers: activity, sleep, smoking, diet, allergies, and whether you take blood pressure or cholesterol medicine or have diabetes.",
        "Health logs: blood pressure, pulse, weight, blood oxygen (optional), symptoms, meals, exercise and sleep.",
        "Lab results you choose to add, and your PAR-Q+ answers.",
        "Family sharing links, saved recipes and exercises, reminders, and feedback you send.",
        "Your phone's notification token, so we can send you notifications.",
      ],
      after: [
        "Your location stays on your phone. It is only used to sort clinics by distance, and it isn't sent to us. Barcode photos aren't stored.",
      ],
    },
    {
      heading: "Why we use it",
      bullets: [
        "To work out your heart risk, habits score, daily targets and suggestions.",
        "To show emergency guidance and pause workouts when a reading or symptom needs it.",
        "To send reminders, notifications and, if you turn on family sharing, alerts to your family.",
        "To let our care team check the app's suggestions, and to measure the app's accuracy for this study.",
        "To answer your feedback and keep accounts secure.",
      ],
      after: ["We don't sell your information or use it for advertising."],
    },
    {
      heading: "Your consent",
      paragraphs: [
        "Health information is sensitive personal information under the law. We store it only because you agreed when you signed up. You can withdraw that consent by deleting your account.",
      ],
    },
    {
      heading: "Who can see your information",
      bullets: [
        "You.",
        "HeartLink's care team in the web portal (Cardiologists, Dietitians and Physical Therapists), each seeing the records for their specialty.",
        "Administrators manage accounts and content but cannot open your health records.",
        "Family members you choose: your blood pressure readings, weekly summaries and alerts, only while sharing is on.",
        "Case reviews show a case code with your age and sex, never your name or contact details.",
      ],
    },
    {
      heading: "Services that handle data for us",
      bullets: [
        "Supabase: stores the database and handles sign-in.",
        "Render and Vercel: run the HeartLink server and web portal.",
        "Brevo: sends emails such as sign-up and password reset codes.",
        "Expo: delivers notifications to your phone.",
        "Groq: an AI service that rewords your Trends summary. It receives your first name and the summary's sentences.",
        "Open Food Facts: receives the food names you search for and the barcodes you scan, straight from your phone.",
        "OpenStreetMap: provides the map on the clinics screen.",
      ],
      after: [
        "These services may store data on servers outside the Philippines. They only use it to provide their service to HeartLink.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "We keep your information while your account is open. When you delete your account, it closes straight away and your records leave the care team's lists, but they stay in our database in archived form.",
        "If you want your records permanently erased, ask us through Settings › Send feedback.",
      ],
    },
    {
      heading: "How we protect it",
      paragraphs: [
        "All connections are encrypted. Your sign-in stays in your phone's secure storage. Staff sign in with a password and an emailed code, each role can open only what it needs, and staff actions are logged.",
        "No system is perfectly secure. If a breach affects your information, we will tell you and the National Privacy Commission as the law requires.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: ["Under the Data Privacy Act you have the right to:"],
      bullets: [
        "Be told how your information is used, which is what this page is for.",
        "See your information, and get a copy (the Visit summary PDF gives you one).",
        "Correct it, in Settings or by editing a log.",
        "Object to how it is used, or withdraw your consent.",
        "Have it blocked or erased.",
        "Complain to the National Privacy Commission (privacy.gov.ph).",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "HeartLink is for adults aged 18 and over. If we learn that a child has signed up, we will close the account.",
      ],
    },
    {
      heading: "Changes and contact",
      paragraphs: [
        "When this policy changes, the date at the top changes too.",
        "To use your rights or ask a question, send a request through Settings › Send feedback.",
      ],
    },
  ],
};

/**
 * 2026-11-24 (panel revision): HeartLink can't check that a user's doctor OK'd it (HL-164's tick box is the user's
 * word). This page is something to show or send the doctor, so the doctor can give a real answer. Keep it in step with
 * what the app does: the limits in services/dailyLimits.ts, the emergencies in services/vitalsCheck.ts and
 * log-symptoms.tsx, and the Heart risk in services/heartRisk.ts.
 */
export const DOCTOR: LegalDoc = {
  title: "For your doctor",
  updated: "24 November 2026",
  intro:
    "Your patient would like to use HeartLink. It isn't made for people with heart disease, a past stroke, kidney disease or a pregnancy, so we ask them to check with you first. This page explains what the app does, so you can decide.",
  sections: [
    {
      heading: "What HeartLink is",
      paragraphs: [
        "A heart-health tracking and prevention app for adults, made by students of Cebu Technological University as a capstone project. It is not a medical device. It doesn't diagnose, treat or replace a doctor.",
        "Nobody monitors the readings. No doctor or nurse watches the app or answers alerts.",
      ],
    },
    {
      heading: "What the user does in the app",
      bullets: [
        "Logs home blood pressure and pulse, and optionally weight, blood oxygen and symptoms.",
        "Logs meals (the app counts sodium), sleep, exercise and steps.",
        "Answers setup questions: blood pressure and cholesterol medicine, diabetes, smoking, activity, sleep and diet.",
      ],
    },
    {
      heading: "What the app gives back",
      bullets: [
        "A daily habits score.",
        "A 10-year heart risk estimate from the American Heart Association's PREVENT equations (ages 30 to 79). These equations are for people without heart disease or stroke, so they may not apply to your patient.",
        "Fixed daily limits: sodium 1,500 mg and cholesterol 200 mg. The user can't raise them.",
        "Recipes approved by a dietitian, and exercises approved by a physical therapist. The PAR-Q+ exercise safety questionnaire decides which exercises are offered.",
      ],
    },
    {
      heading: "Safety messages",
      paragraphs: [
        "The app tells the user to call 911 or go to the nearest hospital when they log any of these:",
      ],
      bullets: [
        "Blood pressure of 180 systolic or more, or 120 diastolic or more.",
        "Blood pressure under 90 systolic or under 60 diastolic.",
        "Chest discomfort rated 7 out of 10 or more, shortness of breath at rest, or fainting or nearly fainting.",
        "Blood oxygen of 88% or lower.",
      ],
      after: ["The app never tells the user to start, stop or change a medicine."],
    },
    {
      heading: "Questions to talk about",
      bullets: [
        "Is it safe for this patient to use HeartLink?",
        "Is a 1,500 mg sodium limit right for them?",
        "Should they avoid any kind of exercise?",
        "Is their blood pressure target different from the usual one?",
      ],
      after: [
        "HeartLink can't check whether you said yes. If the app doesn't suit your patient, please tell them not to use it.",
      ],
    },
  ],
};

export function legalDoc(id: string | undefined): LegalDoc {
  if (id === "doctor") return DOCTOR;
  return id === "privacy" ? PRIVACY : TERMS;
}

/** A page as plain text, for sharing (the "For your doctor" page has a Share button). */
export function docAsText(doc: LegalDoc): string {
  const parts = [doc.title, doc.intro];
  for (const s of doc.sections) {
    parts.push(
      [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? []).map((b) => `- ${b}`), ...(s.after ?? [])].join("\n")
    );
  }
  parts.push(`HeartLink, updated ${doc.updated}`);
  return parts.join("\n\n");
}
