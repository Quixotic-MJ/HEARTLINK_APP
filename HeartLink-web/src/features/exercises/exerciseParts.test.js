import assert from "node:assert/strict";
import test from "node:test";
import {
  countedPromptSeconds,
  partFromStep,
  partSeconds,
} from "./exerciseParts.js";

test("legacy steps with unknown timing stay unknown in the review preview", () => {
  assert.equal(partSeconds(partFromStep("Move gently")), 0);
  assert.equal(partSeconds(partFromStep({ instruction: "Move gently" })), 0);
  assert.equal(
    partSeconds(partFromStep({ instruction: "Lift", mode: "count" })),
    0,
  );
});

test("review preview preserves explicit counts, sides and seconds", () => {
  assert.equal(
    partSeconds(
      partFromStep({
        instruction: "Lift",
        mode: "count",
        reps: 8,
        seconds_per_rep: 4,
        both_sides: true,
      }),
    ),
    64,
  );
  assert.equal(
    partSeconds(partFromStep({ instruction: "Walk", duration_seconds: 65 })),
    65,
  );
});

test("counted playback includes the mobile get-ready prompt without changing movement dose", () => {
  const part = partFromStep({
    instruction: "Lift one leg straight out",
    mode: "count",
    reps: 10,
    seconds_per_rep: 3,
    both_sides: true,
  });
  assert.equal(partSeconds(part), 60);
  assert.equal(countedPromptSeconds(part), 14);
  assert.equal(countedPromptSeconds({ ...part, mode: "time" }), 0);
});
