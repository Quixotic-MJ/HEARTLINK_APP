import test from "node:test";
import assert from "node:assert/strict";
import {
  casesForStep,
  helpPoints,
  isMyTurn,
  lastPickedText,
  stageLabel,
  stepCounts,
  waitingForYou,
} from "./reviewFlow.js";

// HL-168: case review as four steps (pick, check, approve, results).

const items = [
  { id: "a", stage: "check", sections: { cardiology: "waiting", nutrition: "waiting", exercise: "not_needed" } },
  { id: "b", stage: "check", sections: { cardiology: "done", nutrition: "done", exercise: "waiting" } },
  { id: "c", stage: "approve", sections: { cardiology: "done", nutrition: "done", exercise: "done" } },
  { id: "d", stage: "done", outcome: "approved", sections: {} },
  { id: "e", stage: "done", outcome: "practice", sections: {} },
];

test("each step shows its cases", () => {
  assert.deepEqual(casesForStep(items, "pick").map((i) => i.id), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(casesForStep(items, "check").map((i) => i.id), ["a", "b"]);
  assert.deepEqual(casesForStep(items, "approve").map((i) => i.id), ["c"]);
  assert.deepEqual(casesForStep(items, "results").map((i) => i.id), ["d", "e"]);
  assert.deepEqual(stepCounts({ picked: 5, check: 2, approve: 1, approved: 1 }), { pick: 5, check: 2, approve: 1, results: 1 });
  assert.deepEqual(stepCounts(undefined), { pick: 0, check: 0, approve: 0, results: 0 });
});

test("knows whose turn it is", () => {
  const mine = (section) => items.filter((i) => isMyTurn(i, section)).map((i) => i.id);
  assert.deepEqual(mine("cardiology"), ["a", "c"]); // answers first, then approves
  assert.deepEqual(mine("nutrition"), ["a"]);
  assert.deepEqual(mine("exercise"), ["b"]);
  assert.deepEqual(mine(null), []);
});

test("says where a case is in plain words", () => {
  assert.deepEqual(items.map(stageLabel), [
    "Being checked", "Being checked", "Waiting for approval", "In the dataset", "Practice review (not used)",
  ]);
  assert.equal(stageLabel({ stage: "done", outcome: "left_out" }), "Left out");
});

test("plain sentences", () => {
  assert.equal(waitingForYou(0), "Nothing is waiting for you right now.");
  assert.equal(waitingForYou(1), "1 case is waiting for you.");
  assert.equal(waitingForYou(3), "3 cases are waiting for you.");
  assert.equal(lastPickedText(null), "No cases picked yet");
  assert.match(lastPickedText("2026-11-18T09:00:00"), /^Last picked Nov 18$/);
  for (const section of ["cardiology", "nutrition", "exercise", null]) {
    assert.equal(helpPoints(section, section === null).length, 3);
  }
});
