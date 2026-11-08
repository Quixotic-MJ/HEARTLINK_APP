import * as z from "zod";
import { NEW_PART, partFromStep, stepFromPart } from "./exerciseParts.js";

const partSchema = z
  .object({
    instruction: z.string().min(1, "Instruction cannot be empty"),
    details: z.string().optional(),
    mode: z.enum(["time", "count"]).default("time"),
    minutes: z.coerce.number().min(0).default(0),
    seconds: z.coerce
      .number()
      .min(0)
      .max(59, "Use 0 to 59 seconds")
      .default(30),
    reps: z.coerce.number().int().min(0).max(100).default(0),
    seconds_per_rep: z.coerce.number().int().min(0).max(60).default(0),
    both_sides: z.boolean().default(false),
    // Breathing exercises only: what this step asks for. Empty = the app reads it from the words.
    breath: z.enum(["", "in", "hold", "out"]).optional(),
    image: z.string().optional(),
  })
  .refine((p) => p.mode !== "count" || p.reps > 0, {
    message: "Set the reviewed count",
    path: ["reps"],
  })
  .refine((p) => p.mode !== "count" || p.seconds_per_rep > 0, {
    message: "Set the reviewed pace",
    path: ["seconds_per_rep"],
  })
  .refine((p) => p.mode === "count" || p.minutes * 60 + p.seconds > 0, {
    message: "Give it a time",
    path: ["seconds"],
  });

export const exerciseSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().min(1, "Description is required."),
  duration: z.coerce.number().min(1, "Must be at least 1 minute."),
  mediaUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  type: z.string().default("General"),
  intensity: z.string().default("Low"),
  goal: z.string().optional(),
  status: z.string().default("draft"),
  calories: z.coerce.number().min(0).default(0),
  requirements: z.array(z.string()).default([]),
  position: z.string().optional(),
  setting: z.string().optional(),
  effortHint: z.string().optional(),
  frequency: z.string().optional(),
  easierVersion: z.string().optional(),
  skipIf: z.array(z.object({ value: z.string() })).optional(),
  stopIf: z.array(z.object({ value: z.string() })).optional(),
  setupSteps: z
    .array(
      z.object({
        instruction: z.string(),
        details: z.string().optional(),
        image: z.string().optional(),
      }),
    )
    .optional(),
  warmupParts: z.array(partSchema).optional(),
  mainParts: z.array(partSchema).optional(),
  cooldownParts: z.array(partSchema).optional(),
  rounds: z.coerce
    .number()
    .min(1, "At least 1")
    .max(20, "20 at most")
    .default(1),
  restSeconds: z.coerce
    .number()
    .min(0)
    .max(600, "10 minutes at most")
    .default(0),
  guideImages: z
    .array(z.object({ url: z.string().min(1, "URL cannot be empty") }))
    .optional(),
});

export const EMPTY_FORM = {
  name: "",
  description: "",
  duration: 10,
  mediaUrl: "",
  videoUrl: "",
  type: "General",
  intensity: "Low",
  goal: "",
  status: "draft",
  calories: 0,
  requirements: [],
  position: "",
  setting: "",
  effortHint: "",
  frequency: "",
  easierVersion: "",
  skipIf: [],
  stopIf: [],
  setupSteps: [],
  warmupParts: [],
  mainParts: [{ ...NEW_PART }],
  cooldownParts: [],
  rounds: 1,
  restSeconds: 0,
  guideImages: [],
};

const toValues = (list) =>
  Array.isArray(list)
    ? list
        .filter(Boolean)
        .map((v) => ({ value: typeof v === "string" ? v : v.value || "" }))
    : [];
export const fromValues = (list) =>
  (list || []).map((v) => (v.value || "").trim()).filter(Boolean);

export function exerciseValues(exercise) {
  if (!exercise) return EMPTY_FORM;
  const steps = Array.isArray(exercise.steps) ? exercise.steps : [];
  // Old steps have no section: they all count as the main part.
  const inSection = (section) =>
    steps
      .filter(
        (s) =>
          (typeof s === "object" && s?.section ? s.section : "main") ===
          section,
      )
      .map(partFromStep);
  const main = inSection("main");
  return {
    ...EMPTY_FORM,
    ...exercise,
    description: exercise.description || "",
    mediaUrl: exercise.mediaUrl || "",
    videoUrl: exercise.videoUrl || "",
    // "Stretching" was an older type; it plays the same as Stationary.
    type:
      exercise.type === "Stretching"
        ? "Stationary"
        : exercise.type || "General",
    intensity:
      exercise.intensity === "Medium"
        ? "Moderate"
        : exercise.intensity || "Low",
    goal: exercise.goal || "",
    calories: exercise.calories || 0,
    requirements: (exercise.requirements || [])
      .map((r) => (typeof r === "string" ? r : r?.name || r?.value || ""))
      .filter(Boolean),
    position: exercise.position || "",
    setting: exercise.setting || "",
    effortHint: exercise.effortHint || "",
    frequency: exercise.frequency || "",
    easierVersion: exercise.easierVersion || "",
    skipIf: toValues(exercise.skipIf),
    stopIf: toValues(exercise.stopIf),
    setupSteps: (exercise.setupSteps || []).map((s) => ({
      instruction: s.instruction || "",
      details: s.details || "",
      image: s.image || "",
    })),
    warmupParts: inSection("warmup"),
    mainParts: main.length ? main : [{ ...NEW_PART }],
    cooldownParts: inSection("cooldown"),
    rounds: exercise.rounds || 1,
    restSeconds: exercise.restSeconds || 0,
    guideImages: (exercise.guideImages || []).map((img) => ({
      url: typeof img === "string" ? img : img?.url || "",
    })),
  };
}

export function exercisePayload(data, totalSeconds) {
  const breathing = data.type === "Breathing";
  const keep = (parts) =>
    (parts || []).filter((p) => (p.instruction || "").trim());
  const steps = breathing
    ? keep(data.mainParts).map((p) => stepFromPart(p, "main", true))
    : [
        ...keep(data.warmupParts).map((p) => stepFromPart(p, "warmup", false)),
        ...keep(data.mainParts).map((p) => stepFromPart(p, "main", false)),
        ...keep(data.cooldownParts).map((p) =>
          stepFromPart(p, "cooldown", false),
        ),
      ];
  // The three part lists are only for the form; they're saved together as `steps`.
  const rest = { ...data };
  delete rest.warmupParts;
  delete rest.mainParts;
  delete rest.cooldownParts;
  delete rest.expertValidated;
  delete rest.hssTarget;

  return {
    ...rest,
    calories: parseInt(data.calories || 0, 10),
    requirements: (data.requirements || [])
      .map((r) => r.trim())
      .filter(Boolean),
    skipIf: fromValues(data.skipIf),
    stopIf: fromValues(data.stopIf),
    setupSteps: (data.setupSteps || [])
      .filter((s) => (s.instruction || "").trim())
      .map((s) => ({
        instruction: s.instruction.trim(),
        details: (s.details || "").trim(),
        ...(s.image ? { image: s.image.trim() } : {}),
      })),
    steps,
    // Breathing repeats its breaths until its time is up; everything else adds up its parts.
    rounds: breathing ? 1 : data.rounds,
    restSeconds: breathing ? 0 : data.restSeconds,
    duration: breathing
      ? data.duration
      : Math.max(1, Math.ceil(totalSeconds / 60)),
    position: data.position || null,
    setting: data.setting || null,
    guideImages: (data.guideImages || [])
      .map((g) => (g.url || "").trim())
      .filter(Boolean),
  };
}
