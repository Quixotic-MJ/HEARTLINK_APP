import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_FORM,
  exercisePayload,
  exerciseSchema,
  exerciseValues,
} from "./exerciseForm.js";
import { NEW_PART } from "./exerciseParts.js";

test("exercise metadata survives validation and save with the same movement dose", () => {
  const values = exerciseValues({
    name: "Synthetic routine",
    description: "Synthetic instructions",
    difficultyLevel: "Beginner",
    category: "Leg movements",
    targetAreas: ["Thighs", "Hips"],
    tempo: "Slow and steady",
    rounds: 2,
    restSeconds: 10,
    steps: [{ instruction: "Lift", mode: "count", reps: 4, seconds_per_rep: 3, both_sides: true }],
  });
  assert.equal(values.targetAreas, "Thighs, Hips");
  const parsed = exerciseSchema.parse(values);
  const payload = exercisePayload(parsed, 58);
  assert.equal(payload.difficultyLevel, "Beginner");
  assert.equal(payload.category, "Leg movements");
  assert.deepEqual(payload.targetAreas, ["Thighs", "Hips"]);
  assert.equal(payload.tempo, "Slow and steady");
  assert.equal(payload.duration, 1);
  assert.equal(payload.rounds, 2);
  assert.equal(payload.restSeconds, 10);
  assert.equal(payload.steps[0].duration_seconds, 12);
  assert.equal(payload.steps[0].both_sides, true);
});

test("empty optional metadata stays empty and comma-separated body areas are trimmed", () => {
  const values = exerciseValues({ difficultyLevel: null, category: null, targetAreas: null, tempo: null });
  for (const key of ["difficultyLevel", "category", "targetAreas", "tempo"])
    assert.equal(values[key], "");
  const payload = exercisePayload(values, 0);
  assert.equal(payload.difficultyLevel, null);
  assert.equal(payload.category, null);
  assert.deepEqual(payload.targetAreas, []);
  assert.equal(payload.tempo, null);
  assert.deepEqual(exercisePayload({ ...values, targetAreas: " Hips, , Thighs " }, 0).targetAreas, ["Hips", "Thighs"]);
});

test("exercise form mapping keeps sections, count, side, media and legacy labels", () => {
  const input = {
    type: "Stretching",
    intensity: "Medium",
    steps: [
      { instruction: "Move", section: "warmup", duration_seconds: 45 },
      {
        instruction: "Lift",
        mode: "count",
        reps: 4,
        seconds_per_rep: 3,
        both_sides: true,
        image: "/synthetic.png",
      },
    ],
    requirements: [{ name: "Chair" }],
    skipIf: ["Stop rule"],
  };
  const before = structuredClone(input);
  const values = exerciseValues(input);
  assert.equal(values.type, "Stationary");
  assert.equal(values.intensity, "Moderate");
  assert.equal(values.warmupParts[0].seconds, 45);
  assert.equal(values.mainParts[0].reps, 4);
  assert.equal(values.mainParts[0].both_sides, true);
  assert.equal(values.mainParts[0].image, "/synthetic.png");
  assert.deepEqual(values.requirements, ["Chair"]);
  assert.deepEqual(values.skipIf, [{ value: "Stop rule" }]);
  assert.deepEqual(input, before);
});

test("exercise saves preserve reviewed timing and strip form-only approval fields", () => {
  const input = {
    ...EMPTY_FORM,
    type: "Stationary",
    expertValidated: true,
    hssTarget: "retired",
    rounds: 2,
    restSeconds: 10,
    mainParts: [
      {
        ...NEW_PART,
        instruction: " Lift ",
        mode: "count",
        reps: 4,
        seconds_per_rep: 3,
        both_sides: true,
      },
    ],
    requirements: [" Chair ", " "],
    skipIf: [{ value: " Stop " }],
    guideImages: [{ url: " /synthetic.png " }],
  };
  const before = structuredClone(input);
  const payload = exercisePayload(input, 58);
  assert.equal(payload.duration, 1);
  assert.equal(payload.steps[0].duration_seconds, 12);
  assert.equal(payload.steps[0].reps, 4);
  assert.equal(payload.steps[0].both_sides, true);
  assert.deepEqual(payload.requirements, ["Chair"]);
  assert.deepEqual(payload.skipIf, ["Stop"]);
  assert.deepEqual(payload.guideImages, ["/synthetic.png"]);
  for (const key of [
    "expertValidated",
    "hssTarget",
    "mainParts",
    "warmupParts",
    "cooldownParts",
  ])
    assert.equal(Object.hasOwn(payload, key), false);
  assert.deepEqual(input, before);
  const breathing = exercisePayload(
    { ...input, type: "Breathing", duration: 5 },
    58,
  );
  assert.equal(breathing.rounds, 1);
  assert.equal(breathing.restSeconds, 0);
  assert.equal(breathing.duration, 5);
  assert.equal(breathing.steps[0].mode, "time");
});

test("extracted exercise validation still rejects unknown or invalid reviewed dose", () => {
  const valid = {
    ...EMPTY_FORM,
    name: "Synthetic routine",
    description: "Synthetic instructions",
    mainParts: [{ ...NEW_PART, instruction: "Lift" }],
  };
  assert.equal(exerciseSchema.safeParse(valid).success, true);
  for (const part of [
    { mode: "count", reps: 0 },
    { mode: "count", seconds_per_rep: 0 },
    { mode: "time", minutes: 0, seconds: 0 },
    { seconds: 60 },
  ]) {
    assert.equal(
      exerciseSchema.safeParse({
        ...valid,
        mainParts: [{ ...valid.mainParts[0], ...part }],
      }).success,
      false,
    );
  }
});

test("form validation checks the selected timing mode without changing the entered dose", () => {
  const base = {
    ...EMPTY_FORM,
    name: "Synthetic routine",
    description: "Synthetic instructions",
  };
  const counted = exerciseSchema.safeParse({
    ...base,
    mainParts: [
      {
        ...NEW_PART,
        instruction: "Lift",
        mode: "count",
        reps: 4,
        seconds_per_rep: 3,
        minutes: -1,
        seconds: 60,
      },
    ],
  });
  assert.equal(counted.success, true);
  assert.equal(counted.data.mainParts[0].seconds, 60);
  assert.equal(exercisePayload(counted.data, 12).steps[0].duration_seconds, 12);
  const timed = exerciseSchema.safeParse({
    ...base,
    mainParts: [
      {
        ...NEW_PART,
        instruction: "Move",
        mode: "time",
        minutes: 0,
        seconds: 30,
        reps: -1,
        seconds_per_rep: 99,
      },
    ],
  });
  assert.equal(timed.success, true);
  assert.equal(exercisePayload(timed.data, 30).steps[0].duration_seconds, 30);
  const breathing = exerciseSchema.safeParse({
    ...base,
    type: "Breathing",
    warmupParts: [{ ...NEW_PART, instruction: "", seconds: 60 }],
    mainParts: [
      {
        ...NEW_PART,
        instruction: "Breathe",
        mode: "count",
        reps: 0,
        seconds_per_rep: 0,
        minutes: 0,
        seconds: 4,
      },
    ],
  });
  assert.equal(breathing.success, true);
  assert.equal(exercisePayload(breathing.data, 4).steps[0].duration_seconds, 4);
  for (const part of [
    { mode: "count", reps: 101 },
    { mode: "count", reps: 1.5 },
    { mode: "count", seconds_per_rep: 61 },
    { mode: "count", seconds_per_rep: 1.5 },
    { mode: "time", minutes: -1 },
    { mode: "time", seconds: -1 },
  ]) {
    assert.equal(
      exerciseSchema.safeParse({
        ...base,
        mainParts: [{ ...NEW_PART, instruction: "Move", ...part }],
      }).success,
      false,
    );
  }
});
