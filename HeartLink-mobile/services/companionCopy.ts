import type { CompanionGreetingResult } from "./companionService";

/**
 * companionCopy — the single source of HeartLink's companion voice.
 *
 * The voice is warm, first-person, and respectful, addressed by first name
 * only (no honorific guessing; a preferred-address setting is a later pass).
 * Every string here is deterministic, offline-safe, and pre-reviewable.
 *
 * SAFETY CONTRACT (never relax without clinical review):
 * - Educational framing only ("can…", "many people…", "consider…").
 * - Never diagnose, never name conditions, never advise medication.
 * - Crisis-range readings bypass warmth entirely: the caller must render the
 *   clinical template verbatim and route to emergency UI.
 */

/** Phrases the companion voice may never emit. Checked on device and server. */
export const BANNED_PHRASES = [
  "you have",
  "you suffer",
  "diagnos", // diagnosis, diagnosed, diagnostic (as a claim about the user)
  "your heart is",
  "your heart's",
  "disease",
  "disorder",
  "syndrome",
  "prescrib",
  "you should take",
  "you must take",
  "stop taking",
  "stop your meds",
  "skip your meds",
  "you are fine",
  "you're fine",
  "nothing to worry",
  "don't worry about",
];

export function containsBanned(text: string): boolean {
  const lower = (text || "").toLowerCase();
  return BANNED_PHRASES.some((p) => lower.includes(p));
}

export type VoiceTone = "optimal" | "warning" | "caution" | "neutral";

/**
 * Wraps a clinical template greeting in the companion voice.
 * Warning/caution tones are returned VERBATIM (warmth bypass) so urgent
 * guidance is never softened or reworded.
 *
 * Deliberately SHORT (2 lines max on screen): the greeting line above
 * already carries the user's name and the score card carries the detail,
 * so the voice adds only warmth + the single next nudge — never a paragraph.
 */
export function voiceGreeting(
  result: CompanionGreetingResult,
  streakDays: number
): { text: string; voiced: boolean; tone: VoiceTone } {
  const tone = (result.tone || "neutral") as VoiceTone;

  if (tone === "warning" || tone === "caution") {
    return { text: result.greeting, voiced: false, tone };
  }

  if (tone === "optimal") {
    const streakBit = streakDays > 1 ? `, ${streakDays}-day streak` : "";
    return {
      text: `All steady on my end${streakBit} — let's keep the rhythm going.`,
      voiced: true,
      tone,
    };
  }

  return {
    text: "I'm here with you today — tap a mission below to begin.",
    voiced: true,
    tone,
  };
}

/** First-person evening wind-down line (wrap-up card). */
export function eveningNote(firstName: string): string {
  const name = (firstName || "").trim() || "there";
  return (
    `Good evening, ${name}. Let's look back at your vitals, salt balance, ` +
    `and sleep together — and set up a calm night.`
  );
}

/** Specific, first-person acknowledgment right after a log saves. */
export function postLogAck(
  kind: "vitals" | "meal" | "sleep" | "exercise",
  detail: string
): { title: string; message: string } {
  const d = (detail || "").trim();
  switch (kind) {
    case "vitals":
      return {
        title: "Vitals saved",
        message: d
          ? `Noted — ${d}. I'm logging this with you, one steady morning at a time.`
          : "Noted — I've got this one logged with you.",
      };
    case "meal":
      return {
        title: "Meal logged",
        message: d
          ? `Got it — ${d} is in your sodium budget. I'll keep count with you today.`
          : "Got it — I'll keep count of your sodium with you today.",
      };
    case "sleep":
      return {
        title: "Sleep logged",
        message: d
          ? `Rest noted — ${d}. Good recovery sets up a calmer tomorrow.`
          : "Rest noted — good recovery sets up a calmer tomorrow.",
      };
    case "exercise":
      return {
        title: "Activity logged",
        message: d
          ? `Well done — ${d}. I'm proud of that consistency; it matters.`
          : "Well done — I'm proud of that consistency; it matters.",
      };
  }
}
