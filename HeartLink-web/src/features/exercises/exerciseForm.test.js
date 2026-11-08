import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_FORM,
  exercisePayload,
  exerciseSchema,
  exerciseValues,
} from "./exerciseForm.js";
import { NEW_PART } from "./exerciseParts.js";

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
