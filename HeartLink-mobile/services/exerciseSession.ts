import { apiUrl } from "../lib/apiBase";

// Shapes and rules for a guided exercise session: what the portal sends, which "during"
// screen an exercise uses, the order everything plays in, and when workouts are paused.
//
// An exercise has set-up instructions (done once, no timer), then timed parts in three sections:
// warm-up once, the main part repeated for some rounds with rest between, and cool-down once.
// A part lasts a time, or a count of repeats ("10 times, about 3 s each"), and can be done on
// both sides. Older exercises saved before this have one plain list of steps; they're read the
// best way we can (see `legacyShape`).

/** Set in the portal for breathing steps; older exercises leave it out and the words are read instead. */
export type BreathType = "setup" | "in" | "hold" | "out";
export type Section = "warmup" | "main" | "cooldown";

export type ExerciseStep = {
  text: string;
  details: string;
  /** How long it takes once (one side). A count works it out from its repeats. */
  seconds: number;
  breath?: BreathType;
  section: Section;
  mode: "time" | "count";
  reps?: number;
  secondsPerRep?: number;
  bothSides: boolean;
  image?: string;
};

export type SetupStep = { text: string; details: string; image?: string };

export type Routine = {
  id: string;
  title: string;
  description: string;
  goal: string;
  type: string;
  intensity: string;
  minutes: number;
  setup: SetupStep[];
  steps: ExerciseStep[];
  rounds: number;
  restSeconds: number;
  image: string;
  guideImages: string[];
  videoUrl: string;
  requirements: string[];
  position: "Seated" | "Standing" | "Lying down" | "Walking" | null;
  setting: "Indoors" | "Outdoors" | "Either" | null;
  skipIf: string[];
  stopIf: string[];
  easierVersion: string;
  effortHint: string;
  frequency: string;
  reviewedAt: string | null;
};

/** Which "during" screen an exercise uses. */
export type ExerciseKind = "breathing" | "cardio" | "steps" | "guide";

type RawStep =
  | string
  | {
      instruction?: string | null;
      details?: string | null;
      duration_seconds?: number | null;
      breath?: string | null;
      section?: string | null;
      mode?: string | null;
      reps?: number | null;
      seconds_per_rep?: number | null;
      both_sides?: boolean | null;
      image?: string | null;
    };
type RawSetup = string | { instruction?: string | null; details?: string | null; image?: string | null };
const BREATH_TYPES: BreathType[] = ["setup", "in", "hold", "out"];
const SECTIONS: Section[] = ["warmup", "main", "cooldown"];
const POSITIONS = ["Seated", "Standing", "Lying down", "Walking"] as const;
const SETTINGS = ["Indoors", "Outdoors", "Either"] as const;

/** An exercise as the server sends it. */
export type RoutineApi = {
  id: string | number;
  name?: string | null;
  description?: string | null;
  goal?: string | null;
  type?: string | null;
  intensity?: string | null;
  duration_minutes?: number | null;
  steps?: RawStep[] | null;
  setup_steps?: RawSetup[] | null;
  rounds?: number | null;
  rest_seconds?: number | null;
  media_url?: string | null;
  video_url?: string | null;
  guide_images?: string[] | null;
  requirements?: (string | { name?: string })[] | null;
  equipment?: (string | { name?: string })[] | null;
  position?: string | null;
  setting?: string | null;
  skip_if?: string[] | null;
  stop_if?: string[] | null;
  easier_version?: string | null;
  effort_hint?: string | null;
  frequency?: string | null;
  reviewed_at?: string | null;
};

/** The portal saves a step's time as 5 seconds unless the expert changes it. */
const DEFAULT_STEP_SECONDS = 5;

function mediaUrl(url?: string | null) {
  if (!url) return "";
  return /^(https?:|data:)/.test(url) ? url : apiUrl(url);
}

const textList = (list?: (string | null)[] | null) => (list ?? []).map((s) => (s ?? "").trim()).filter(Boolean);

/** Placeholder details in older exercises that add nothing when read out at every step. */
const FILLER_DETAILS = /^(follow the instructions carefully|follow the instructions|n\/a|none)\.?$/i;
const cleanDetails = (d?: string | null) => {
  const text = (d ?? "").trim();
  return FILLER_DETAILS.test(text) ? "" : text;
};

function toStep(s: RawStep): ExerciseStep {
  if (typeof s === "string") return { text: s.trim(), details: "", seconds: DEFAULT_STEP_SECONDS, section: "main", mode: "time", bothSides: false };
  const mode = s.mode === "count" ? "count" : "time";
  const reps = Math.max(1, s.reps || 10);
  const secondsPerRep = Math.max(1, s.seconds_per_rep || 3);
  return {
    text: (s.instruction ?? "").trim(),
    details: cleanDetails(s.details),
    seconds: mode === "count" ? reps * secondsPerRep : Math.max(1, s.duration_seconds || DEFAULT_STEP_SECONDS),
    section: SECTIONS.includes(s.section as Section) ? (s.section as Section) : "main",
    mode,
    ...(mode === "count" ? { reps, secondsPerRep } : {}),
    bothSides: !!s.both_sides,
    ...(BREATH_TYPES.includes(s.breath as BreathType) ? { breath: s.breath as BreathType } : {}),
    ...(s.image ? { image: mediaUrl(s.image) } : {}),
  };
}

/** A list from the server, turned into Routines (a stable function, so React Query can reuse its result). */
export function toRoutines(data: RoutineApi[] | unknown): Routine[] {
  return Array.isArray(data) ? (data as RoutineApi[]).map(toRoutine) : [];
}

export function toRoutine(data: RoutineApi): Routine {
  const steps = (data.steps ?? []).map(toStep).filter((s) => s.text.length > 0);
  const setup = (data.setup_steps ?? [])
    .map((s): SetupStep =>
      typeof s === "string"
        ? { text: s.trim(), details: "" }
        : { text: (s.instruction ?? "").trim(), details: (s.details ?? "").trim(), ...(s.image ? { image: mediaUrl(s.image) } : {}) },
    )
    .filter((s) => s.text.length > 0);
  const needs = data.requirements ?? data.equipment ?? [];
  const routine: Routine = {
    id: String(data.id),
    title: data.name || "Exercise",
    description: data.description || "",
    goal: data.goal || "",
    type: data.type || "General",
    intensity: data.intensity || "Low",
    minutes: Math.max(1, data.duration_minutes || 1),
    setup,
    steps,
    rounds: Math.min(20, Math.max(1, data.rounds || 1)),
    restSeconds: Math.min(600, Math.max(0, data.rest_seconds || 0)),
    image: mediaUrl(data.media_url),
    guideImages: (data.guide_images ?? []).map(mediaUrl).filter(Boolean),
    videoUrl: data.video_url || "",
    requirements: needs.map((n) => (typeof n === "string" ? n : n.name || "")).filter(Boolean),
    position: POSITIONS.find((p) => p === data.position) ?? null,
    setting: SETTINGS.find((p) => p === data.setting) ?? null,
    skipIf: textList(data.skip_if),
    stopIf: textList(data.stop_if),
    easierVersion: (data.easier_version || "").trim(),
    effortHint: (data.effort_hint || "").trim(),
    frequency: (data.frequency || "").trim(),
    reviewedAt: data.reviewed_at || null,
  };
  // Saved in the new layout when any step has a section, or set-up / rounds were filled in.
  const structured = (data.steps ?? []).some((s) => typeof s === "object" && s !== null && !!s.section) || setup.length > 0 || (data.rounds ?? 1) > 1;
  const shaped = structured ? withExtraPictures(routine) : legacyShape(routine);
  return shaped.position ? shaped : { ...shaped, position: guessPosition(shaped) };
}

/**
 * Pictures uploaded under "Extra pictures" instead of on each step: when no step has a picture of
 * its own and there is exactly one picture per step (set-up steps first, then the parts in order),
 * give each step its picture. Any other count is left alone rather than guessed.
 */
export function withExtraPictures(r: Routine): Routine {
  const slots = r.setup.length + r.steps.length;
  const ownPictures = r.setup.some((s) => s.image) || r.steps.some((s) => s.image);
  if (ownPictures || slots === 0 || r.guideImages.length !== slots) return r;
  const pics = r.guideImages;
  return {
    ...r,
    setup: r.setup.map((s, i) => ({ ...s, image: pics[i] })),
    steps: r.steps.map((s, i) => ({ ...s, image: pics[r.setup.length + i] })),
  };
}

/**
 * The position for an exercise that doesn't have one set: read from its name, set-up, steps and
 * equipment ("Lie flat on your back", "Sit in a chair"). Walks are walking; breathing is seated.
 * Null when there's no clue, which the checklist treats as standing.
 */
export function guessPosition(r: Pick<Routine, "title" | "type" | "setup" | "steps" | "requirements">): Routine["position"] {
  const words = [r.title, ...r.setup.map((s) => s.text), ...r.steps.map((s) => s.text), ...r.requirements].join(" ").toLowerCase();
  if (/\b(lie|lying|lay|on your back|on the floor on your)\b/.test(words)) return "Lying down";
  if (exerciseKind(r) === "cardio" || /\b(walk|walking|jog)\b/.test(r.title.toLowerCase())) return "Walking";
  if (/\b(sit|sitting|seated|chair)\b/.test(words)) return "Seated";
  if (/\b(stand|standing)\b/.test(words)) return "Standing";
  if (r.type.toLowerCase().includes("breath")) return "Seated";
  return null;
}

const SETUP_WORDS = /^(sit|stand|lie|lay|place|find|get|hold on|put)\b/i;

/**
 * Older exercises are one plain list of timed steps. Read them the way they were meant:
 * - short opening steps like "Sit with feet flat on the floor" become set-up (no timer);
 *   for breathing, everything before the first breath does;
 * - a walk whose step times don't match its length shares the time evenly between its steps;
 * - a move-by-move exercise much shorter than its length repeats until the time is up.
 */
export function legacyShape(r: Routine): Routine {
  const kind = exerciseKind(r);
  // Old exercises matched pictures to steps by order; give each step its own picture first, so
  // moving the set-up steps out doesn't shift the pictures onto the wrong step.
  let steps = r.steps.map((s, i) => (s.image || !r.guideImages[i] ? s : { ...s, image: r.guideImages[i] }));
  let setup = r.setup;
  let rounds = r.rounds;

  let lead = 0;
  if (kind === "breathing") {
    while (lead < steps.length && stepCue(steps[lead]) === "other") lead++;
    if (lead === steps.length) lead = 0; // no breaths at all (a relaxation): keep every step timed
  } else {
    while (lead < steps.length - 1 && steps[lead].seconds <= 10 && SETUP_WORDS.test(steps[lead].text)) lead++;
  }
  if (lead > 0) {
    setup = steps.slice(0, lead).map((s) => ({ text: s.text, details: s.details, ...(s.image ? { image: s.image } : {}) }));
    steps = steps.slice(lead);
  }

  // "Repeat for 5 minutes continuously" isn't a step of its own: drop it and repeat the steps
  // before it in rounds instead (below).
  steps = steps.filter((s, i) => !(i > 0 && /^repeat\b.*\b(minutes?|continuously)\b/i.test(s.text)));

  // A first step that warms up and a last step that cools down are those sections.
  if (steps.length >= 2 && /^warm(ing)?[\s-]?up\b/i.test(steps[0].text)) steps = steps.map((s, i) => (i === 0 ? { ...s, section: "warmup" as const } : s));
  if (steps.length >= 2 && /^cool(ing)?[\s-]?down\b/i.test(steps[steps.length - 1].text)) {
    steps = steps.map((s, i) => (i === steps.length - 1 ? { ...s, section: "cooldown" as const } : s));
  }

  const planned = r.minutes * 60;
  const sum = totalStepSeconds(steps);
  if (kind === "cardio" && steps.length > 0 && Math.abs(sum - planned) > planned * 0.1) {
    steps = steps.map((s) => ({ ...s, seconds: Math.round(planned / steps.length) }));
  }
  if (kind === "steps" && sum > 0 && sum < planned * 0.8) {
    rounds = Math.min(20, Math.max(1, Math.round(planned / sum)));
  }
  return { ...r, setup, steps, rounds };
}

/**
 * The portal's exercise types are Breathing, Light Cardio, Stationary and General.
 * Older exercises are matched by name too (e.g. "Neighbourhood walk", "Full body stretch").
 */
export function exerciseKind(r: Pick<Routine, "type" | "title"> & { steps?: ExerciseStep[] }): ExerciseKind {
  const type = r.type.toLowerCase();
  const title = r.title.toLowerCase();
  if (type.includes("breath") || title.includes("breathing")) {
    // A "breathing" exercise with no breaths in it (e.g. a guided relaxation) goes step by step.
    const noBreaths = r.steps && r.steps.length > 0 && r.steps.every((s) => stepCue(s) === "other");
    return noBreaths ? "steps" : "breathing";
  }
  if (type.includes("cardio") || /\b(walk|jog)/.test(title)) return "cardio";
  if (type.includes("stationary") || type.includes("stretch") || title.includes("stretch")) return "steps";
  return "guide";
}

export type StepPosition = { index: number; stepElapsed: number; stepSeconds: number };

/** Light cardio: the planned time is shared evenly between the steps. */
export function evenStepAt(stepCount: number, totalSeconds: number, elapsed: number): StepPosition {
  const count = Math.max(1, stepCount);
  const each = totalSeconds / count;
  const index = Math.min(count - 1, Math.floor(elapsed / each));
  return { index, stepElapsed: elapsed - index * each, stepSeconds: each };
}

/** Move by move: each step lasts its own time, one after another. */
export function timedStepAt(steps: ExerciseStep[], position: number): StepPosition {
  let start = 0;
  for (let i = 0; i < steps.length; i++) {
    if (position < start + steps[i].seconds || i === steps.length - 1) {
      return { index: i, stepElapsed: Math.min(position - start, steps[i].seconds), stepSeconds: steps[i].seconds };
    }
    start += steps[i].seconds;
  }
  return { index: 0, stepElapsed: 0, stepSeconds: DEFAULT_STEP_SECONDS };
}

export type BreathCue = "in" | "hold" | "out" | "other";

/** What a breathing step asks for, read from its words ("Inhale through the nose" → in). */
export function breathCue(text: string): BreathCue {
  const t = text.toLowerCase();
  if (/\binhal|\bbreathe? in\b|\bin through\b/.test(t)) return "in";
  if (/\bexhal|\bbreathe? out\b|\bout through\b/.test(t)) return "out";
  if (/\bhold\b|\bpause\b/.test(t)) return "hold";
  return "other";
}

/** What a step asks for: the type picked in the portal, else read from its words. */
export function stepCue(step: ExerciseStep): BreathCue {
  if (step.breath === "setup") return "other";
  if (step.breath) return step.breath;
  return breathCue(step.text);
}

/**
 * Steps before the first breath (e.g. "Sit comfortably") happen once, as set-up;
 * the rest repeat as rounds.
 */
export function breathingPlan(steps: ExerciseStep[]) {
  const first = steps.findIndex((s) => stepCue(s) !== "other");
  if (first <= 0) return { prep: [] as ExerciseStep[], cycle: steps };
  return { prep: steps.slice(0, first), cycle: steps.slice(first) };
}

/** Breathing: set-up steps once, then the breaths repeat as rounds until the planned time is up. */
export function breathingAt(steps: ExerciseStep[], elapsed: number) {
  const { prep, cycle } = breathingPlan(steps);
  const prepSeconds = totalStepSeconds(prep);
  const roundSeconds = totalStepSeconds(cycle) || DEFAULT_STEP_SECONDS;
  if (elapsed < prepSeconds) {
    const pos = timedStepAt(prep, elapsed);
    return { ...pos, step: prep[pos.index], inPrep: true, roundIndex: 0, roundSeconds, prepSeconds, cycle, occurrence: pos.index };
  }
  const e = elapsed - prepSeconds;
  const roundIndex = Math.floor(e / roundSeconds);
  const pos = timedStepAt(cycle, e % roundSeconds);
  return {
    ...pos,
    step: cycle[pos.index],
    inPrep: false,
    roundIndex,
    roundSeconds,
    prepSeconds,
    cycle,
    /** Counts every step played so far, so each breath is told apart from the same step last round. */
    occurrence: prep.length + roundIndex * cycle.length + pos.index,
  };
}

export function totalStepSeconds(steps: ExerciseStep[]) {
  return steps.reduce((sum, s) => sum + s.seconds, 0);
}

/** What the dashboard says about whether active exercise is a good idea today. */
export type Readiness = { hss_score?: number | null; hss_tier?: string | null; has_recent_severe_symptom?: boolean | null };

/**
 * Active workouts pause when the score is critical (under 50) or a severe symptom was logged
 * recently. Breathing exercises stay open.
 */
export function isWorkoutPaused(d: Readiness | undefined, kind: ExerciseKind) {
  if (!d || kind === "breathing") return false;
  const score = typeof d.hss_score === "number" ? d.hss_score : 0;
  return d.hss_tier === "Critical" || (score > 0 && score < 50) || !!d.has_recent_severe_symptom;
}

/** 252 → "4:12", 5 → "0:05" */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 252 → "4 min 12 s", 45 → "45 s", 600 → "10 min" */
export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} min ${rest} s` : `${m} min`;
}

/** What the voice says for a step: its instruction, its details, and how many times. */
export function spokenStep(step: (Pick<ExerciseStep, "text" | "details"> & Partial<ExerciseStep>) | undefined) {
  if (!step) return "";
  const count = step.mode === "count" && step.reps ? `${step.reps} times${step.bothSides ? " on each side" : ""}` : "";
  return [step.text, step.details, count]
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .join(". ");
}

// ─── The order everything plays in ───────────────────────────────────────────

/** One stretch of time in an exercise: a part (one side of it) or a rest between rounds. */
export type Segment = {
  kind: "part" | "rest";
  step?: ExerciseStep;
  section: Section;
  /** Which round of the main part (1-based); 0 for warm-up and cool-down. */
  round: number;
  rounds: number;
  /** 0 = done once; 1 and 2 = first and second side. */
  side: 0 | 1 | 2;
  seconds: number;
  /**
   * Counted moves only: seconds at the start to hear the instruction before counting begins
   * (part of `seconds`). Timed parts start straight away.
   */
  leadIn: number;
  /** Seconds from the start of the exercise. */
  start: number;
  /** Where the step sits in routine.steps (-1 for a rest). */
  partIndex: number;
};

/** Warm-up once, the main part for each round with rest between, cool-down once. */
export function buildTimeline(r: Pick<Routine, "steps" | "rounds" | "restSeconds">): Segment[] {
  const out: Segment[] = [];
  let t = 0;
  const push = (seg: Omit<Segment, "start">) => {
    out.push({ ...seg, start: t });
    t += seg.seconds;
  };
  const add = (step: ExerciseStep, partIndex: number, round: number) => {
    const leadIn = step.mode === "count" ? leadInSeconds(step) : 0;
    const base = { kind: "part" as const, step, section: step.section, round, rounds: r.rounds, seconds: step.seconds + leadIn, leadIn, partIndex };
    if (step.bothSides) {
      push({ ...base, side: 1 });
      push({ ...base, side: 2 });
    } else push({ ...base, side: 0 });
  };
  const inSection = (section: Section) => r.steps.map((step, i) => ({ step, i })).filter((x) => x.step.section === section);

  inSection("warmup").forEach(({ step, i }) => add(step, i, 0));
  const main = inSection("main");
  for (let round = 1; round <= r.rounds && main.length > 0; round++) {
    main.forEach(({ step, i }) => add(step, i, round));
    if (round < r.rounds && r.restSeconds > 0) push({ kind: "rest", section: "main", round, rounds: r.rounds, side: 0, seconds: r.restSeconds, leadIn: 0, partIndex: -1 });
  }
  inSection("cooldown").forEach(({ step, i }) => add(step, i, 0));
  return out;
}

/**
 * Time to read a counted move's instruction out loud (plus a short "Round 2 of 3" or "Now the
 * other side" before it) at the voice's slightly slow pace, so counting never talks over it.
 */
export function leadInSeconds(step: ExerciseStep) {
  const words = spokenStep(step).split(/\s+/).filter(Boolean).length + 4;
  return Math.min(8, Math.max(3, Math.ceil(words / 2.3)));
}

export function timelineSeconds(timeline: Segment[]) {
  const last = timeline[timeline.length - 1];
  return last ? last.start + last.seconds : 0;
}

/** Which segment is playing `position` seconds in, and how far into it. */
export function segmentAt(timeline: Segment[], position: number) {
  let index = 0;
  for (let i = 0; i < timeline.length; i++) {
    if (position >= timeline[i].start) index = i;
    else break;
  }
  const segment = timeline[index];
  return { index, segment, elapsed: segment ? Math.min(segment.seconds, Math.max(0, position - segment.start)) : 0 };
}

/** How long the whole exercise is meant to take. Breathing runs for its set time. */
export function routineSeconds(r: Routine) {
  if (exerciseKind(r) === "breathing") return r.minutes * 60;
  return timelineSeconds(buildTimeline(r)) || r.minutes * 60;
}

/** "10 times, each side" / "2 min" / "45 s, each side" */
export function describePart(step: ExerciseStep) {
  const amount =
    step.mode === "count"
      ? `${step.reps} times`
      : step.seconds >= 60
        ? `${Math.floor(step.seconds / 60)} min${step.seconds % 60 ? ` ${step.seconds % 60} s` : ""}`
        : `${step.seconds} s`;
  return step.bothSides ? `${amount}, each side` : amount;
}

export const SECTION_NAME: Record<Section, string> = { warmup: "Warm-up", main: "Main part", cooldown: "Cool-down" };

// ─── "Before you start" ──────────────────────────────────────────────────────

export type CheckItem = { value: string; label: string; desc?: string };

/**
 * The ticks before an exercise: water, the right support for its position (a chair, something to
 * hold, a mat, a safe route), shoes and space where they matter, each piece of equipment it needs,
 * and, when the expert listed reasons to skip it, a tick that none of them apply today.
 */
export function checklistFor(r: Pick<Routine, "requirements" | "position" | "skipIf">): CheckItem[] {
  const needs = r.requirements;
  const has = (re: RegExp) => needs.some((n) => re.test(n));
  const items: CheckItem[] = [];
  if (!has(/water/i)) items.push({ value: "water", label: "Water within reach", desc: "Take small sips if you feel thirsty." });
  if (r.position === "Lying down") {
    if (!has(/mat|bed|pillow/i)) items.push({ value: "lie", label: "A mat or bed to lie on", desc: "Somewhere you can get up from easily." });
  } else if (r.position === "Walking") {
    items.push({ value: "route", label: "A safe, flat route", desc: "Even ground, not too far from home." });
  } else if (r.position === "Seated") {
    if (!has(/chair/i)) items.push({ value: "chair", label: "A sturdy chair without wheels", desc: "Sit with your feet flat on the floor." });
  } else if (!has(/chair|wall|counter/i)) {
    items.push({ value: "support", label: "A sturdy chair or wall nearby", desc: "To hold on to if you feel unsteady." });
  }
  if ((r.position === "Standing" || r.position === "Walking" || !r.position) && !has(/shoe|cloth/i)) {
    items.push({ value: "shoes", label: "Comfortable shoes and clothes", desc: "Shoes with good grip, nothing tight." });
  }
  if ((r.position === "Standing" || !r.position) && !has(/space|room/i)) {
    items.push({ value: "space", label: "Clear space around you", desc: "Nothing on the floor to trip over." });
  }
  needs.forEach((n) => items.push({ value: `need:${n}`, label: n }));
  if (r.skipIf.length > 0) items.push({ value: "skip", label: "None of the reasons to skip apply to me today" });
  return items;
}
