// Shared by the exercise form and its parts editor: what a part looks like in the form, how long
// it takes, and how it turns into a saved step and back.

export const NEW_PART = { instruction: "", details: "", mode: "time", minutes: 0, seconds: 30, reps: 10, seconds_per_rep: 3, both_sides: false, breath: "", image: "" };

/** Seconds one part takes (a count works out its own time); both sides doubles it. */
export function partSeconds(part) {
  if (!part) return 0;
  const once =
    part.mode === "count"
      ? (Number(part.reps) || 0) * (Number(part.seconds_per_rep) || 0)
      : (Number(part.minutes) || 0) * 60 + (Number(part.seconds) || 0);
  return once * (part.both_sides ? 2 : 1);
}

/** 1290 → "21 min 30 s" */
export function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  if (!m) return `${s} s`;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/** A saved step → a form row. Old steps have no section, mode or minutes. */
export function partFromStep(step) {
  if (typeof step === "string") return { ...NEW_PART, instruction: step };
  const secs = Number(step?.duration_seconds) || 30;
  return {
    ...NEW_PART,
    instruction: step?.instruction || step?.value || "",
    details: step?.details || "",
    mode: step?.mode === "count" ? "count" : "time",
    minutes: Math.floor(secs / 60),
    seconds: secs % 60,
    reps: step?.reps || 10,
    seconds_per_rep: step?.seconds_per_rep || 3,
    both_sides: !!step?.both_sides,
    breath: step?.breath || "",
    image: step?.image || "",
  };
}

/** A form row → a saved step. */
export function stepFromPart(part, section, isBreathing) {
  const step = {
    instruction: (part.instruction || "").trim(),
    details: (part.details || "").trim(),
    section,
    mode: isBreathing ? "time" : part.mode === "count" ? "count" : "time",
    duration_seconds: Math.max(1, part.mode === "count" && !isBreathing ? (Number(part.reps) || 1) * (Number(part.seconds_per_rep) || 1) : (Number(part.minutes) || 0) * 60 + (Number(part.seconds) || 0)),
    both_sides: !isBreathing && !!part.both_sides,
  };
  if (step.mode === "count") {
    step.reps = Math.max(1, Number(part.reps) || 1);
    step.seconds_per_rep = Math.max(1, Number(part.seconds_per_rep) || 1);
  }
  if (isBreathing && part.breath) step.breath = part.breath;
  if ((part.image || "").trim()) step.image = part.image.trim();
  return step;
}

/** Common equipment to pick, plus anything else typed in. Shown to patients on the "Before you start" check. */
export const EQUIPMENT_PRESETS = [
  "Sturdy chair without wheels",
  "Wall or counter to hold",
  "Exercise mat",
  "Pillow",
  "Water bottle",
  "Towel",
  "Walking shoes",
  "Light weights",
  "Resistance band",
];
