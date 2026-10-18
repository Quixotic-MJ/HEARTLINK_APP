import { buildTimeline, checklistFor, describePart, leadInSeconds, routineSeconds, segmentAt, timelineSeconds, toRoutine } from "../exerciseSession";
import { headsUp, nextName, segmentIntro } from "../../hooks/useExerciseTimeline";

// A leg-lift routine saved in the new layout: set-up, warm-up, 3 rounds of a counted move on
// both sides with 30 s rest, and a cool-down.
const legLifts = toRoutine({
  id: "l1",
  name: "Seated leg lifts",
  type: "Stationary",
  duration_minutes: 6,
  setup_steps: [{ instruction: "Sit near the front of a sturdy chair" }],
  steps: [
    { instruction: "March gently in place", section: "warmup", mode: "time", duration_seconds: 60 },
    { instruction: "Lift one leg straight out", section: "main", mode: "count", reps: 10, seconds_per_rep: 3, both_sides: true },
    { instruction: "Rest your feet and breathe", section: "cooldown", mode: "time", duration_seconds: 30 },
  ],
  rounds: 3,
  rest_seconds: 30,
  position: "Seated",
  requirements: ["Sturdy chair without wheels"],
  skip_if: ["You have knee pain today"],
});

describe("exercise structure", () => {
  it("keeps the set-up out of the timer and plays warm-up, rounds with rest, then cool-down", () => {
    expect(legLifts.setup.map((s) => s.text)).toEqual(["Sit near the front of a sturdy chair"]);
    const t = buildTimeline(legLifts);
    const shape = t.map((s) => (s.kind === "rest" ? "rest" : `${s.section}${s.round ? s.round : ""}${s.side ? `/${s.side}` : ""}`));
    expect(shape).toEqual(["warmup", "main1/1", "main1/2", "rest", "main2/1", "main2/2", "rest", "main3/1", "main3/2", "cooldown"]);
    // Each counted side starts with a short get-ready moment to hear the instruction (7 s here).
    const ready = leadInSeconds(legLifts.steps[1]);
    expect(ready).toBe(7);
    expect(t[1]).toMatchObject({ seconds: 30 + ready, leadIn: ready });
    // 60 + 3 rounds of 2 sides (30 + get ready) + 2 rests of 30 + 30
    const total = 60 + 3 * 2 * (30 + ready) + 60 + 30;
    expect(timelineSeconds(t)).toBe(total);
    expect(routineSeconds(legLifts)).toBe(total);
    expect(segmentAt(t, 60 + 30 + ready + 5)).toMatchObject({ index: 2, elapsed: 5 });
  });

  it("describes and announces each part", () => {
    const t = buildTimeline(legLifts);
    expect(describePart(legLifts.steps[1])).toBe("10 times, each side");
    expect(segmentIntro(t[0], undefined)).toBe("Let's warm up. March gently in place");
    expect(segmentIntro(t[1], t[0])).toBe("Now the main part. Round 1 of 3. Lift one leg straight out. 10 times on each side");
    expect(segmentIntro(t[2], t[1])).toBe("Now the other side. Lift one leg straight out");
    expect(segmentIntro(t[3], t[2])).toBe("Rest for 30 seconds. Breathe easy.");
    expect(segmentIntro(t[4], t[3])).toBe("Round 2 of 3. Lift one leg straight out. 10 times on each side");
    expect(segmentIntro(t[9], t[8])).toBe("Time to cool down. Rest your feet and breathe");
    expect(nextName(t[2])).toBe("the other side");
    expect(nextName(t[3])).toBe("a short rest");
  });

  it("warns 10 seconds ahead without repeating the next instruction", () => {
    const t = buildTimeline(legLifts);
    // warm-up → main, side 1 → side 2, side 2 → rest, rest → round 2, end
    expect(headsUp(t[0], t[1])).toBe("Next, in 10 seconds: the main part.");
    expect(headsUp(t[1], t[2])).toBe("10 seconds, then the other side.");
    expect(headsUp(t[2], t[3])).toBe("10 seconds, then a short rest.");
    expect(headsUp(t[3], t[4])).toBe("Round 2 starts in 10 seconds.");
    expect(headsUp(t[9], undefined)).toBe("Almost done. 10 seconds to go.");
    for (let i = 0; i < t.length - 1; i++) expect(headsUp(t[i], t[i + 1])).not.toContain("Lift one leg");
  });

  it("builds the before-you-start ticks from the exercise", () => {
    const labels = checklistFor(legLifts).map((i) => i.label);
    // Seated with its own chair: no second chair, no shoes, no floor space; the chair it needs; the skip tick.
    expect(labels).toEqual(["Water within reach", "Sturdy chair without wheels", "None of the reasons to skip apply to me today"]);
    const walk = checklistFor({ requirements: ["Walking shoes", "Water bottle"], position: "Walking", skipIf: [] }).map((i) => i.label);
    expect(walk).toEqual(["A safe, flat route", "Walking shoes", "Water bottle"]);
  });

  it("reads old exercises sensibly", () => {
    // A walk saved with proper times plays them as saved: no more equal thirds.
    const walk = toRoutine({
      id: "w",
      name: "20-Minute Neighborhood Walk",
      type: "Light Cardio",
      duration_minutes: 20,
      steps: [
        { instruction: "Warm up with light stretching.", duration_seconds: 120 },
        { instruction: "Walk at a comfortable, conversational pace.", duration_seconds: 900 },
        { instruction: "Cool down with a slower pace.", duration_seconds: 180 },
      ],
    });
    expect(buildTimeline(walk).map((s) => s.seconds)).toEqual([120, 900, 180]);

    // A 10-minute leg routine whose steps add up to 1 minute: the "Sit" opening becomes set-up and
    // the moves repeat until the time is up.
    const old = toRoutine({
      id: "o",
      name: "Seated Leg Lifts",
      type: "Stationary",
      duration_minutes: 10,
      steps: [
        { instruction: "Sit with feet flat on the floor.", duration_seconds: 10 },
        { instruction: "Slowly extend one leg straight out.", duration_seconds: 15 },
        { instruction: "Hold for 3 seconds, then lower.", duration_seconds: 10 },
        { instruction: "Repeat for the other leg.", duration_seconds: 25 },
      ],
      guide_images: ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"],
    });
    expect(old.setup.map((s) => s.text)).toEqual(["Sit with feet flat on the floor."]);
    expect(old.rounds).toBe(12);
    // Pictures stay with their own step after the set-up moves out.
    expect(old.steps[0].image).toMatch(/\/b\.jpg$/);
  });
});
