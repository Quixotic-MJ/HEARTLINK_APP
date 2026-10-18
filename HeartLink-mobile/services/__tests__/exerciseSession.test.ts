import {
  breathCue,
  breathingAt,
  evenStepAt,
  exerciseKind,
  formatClock,
  formatDuration,
  isWorkoutPaused,
  stepCue,
  timedStepAt,
  toRoutine,
} from "../exerciseSession";
import { elapsedSeconds } from "../../hooks/useSessionClock";

const step = (text: string, seconds: number) => ({ text, details: "", seconds, section: "main" as const, mode: "time" as const, bothSides: false });

describe("exercise session rules", () => {
  it("opens the screen that matches each portal type", () => {
    expect(exerciseKind({ type: "Breathing", title: "Box breathing" })).toBe("breathing");
    expect(exerciseKind({ type: "Light Cardio", title: "Morning walk" })).toBe("cardio");
    expect(exerciseKind({ type: "Stationary", title: "Seated leg raises" })).toBe("steps");
    expect(exerciseKind({ type: "General", title: "Chair strength routine" })).toBe("guide");
    // Older exercises are matched by name.
    expect(exerciseKind({ type: "General", title: "Full body stretch" })).toBe("steps");
    expect(exerciseKind({ type: "General", title: "Neighbourhood walk" })).toBe("cardio");
  });

  it("reads the portal's steps, whether plain text or with times", () => {
    const r = toRoutine({
      id: 7,
      name: "Seated stretches",
      type: "Stationary",
      duration_minutes: 5,
      steps: ["  Sit tall  ", { instruction: "Shoulder rolls", details: "Slowly", duration_seconds: 30 }, { instruction: "" }],
    });
    expect(r.id).toBe("7");
    // An old exercise: the short "Sit tall" opening becomes set-up, done before the timer starts.
    expect(r.setup).toEqual([{ text: "Sit tall", details: "" }]);
    expect(r.steps).toEqual([{ text: "Shoulder rolls", details: "Slowly", seconds: 30, section: "main", mode: "time", bothSides: false }]);
  });

  it("finds the current step", () => {
    // Light cardio: 12 minutes shared by 3 steps.
    expect(evenStepAt(3, 720, 250).index).toBe(1);
    // Move by move: 10 s then 20 s.
    expect(timedStepAt([step("A", 10), step("B", 20)], 12)).toEqual({ index: 1, stepElapsed: 2, stepSeconds: 20 });
    // Breathing repeats: in 4, hold 4, out 6 = 14 s a round; 30 s is round 3, 2 s into "in".
    const b = breathingAt([step("Breathe in", 4), step("Hold", 4), step("Breathe out", 6)], 30);
    expect(b).toMatchObject({ index: 0, stepElapsed: 2, roundIndex: 2, roundSeconds: 14, inPrep: false });
  });

  it("does breathing set-up once, then repeats the breaths", () => {
    const steps = [step("Sit comfortably in upright position.", 10), step("Inhale smoothly through nostrils.", 4), step("Hold basal volume.", 2), step("Exhale silently through mouth.", 6)];
    // "in upright" is not a breath.
    expect(breathCue(steps[0].text)).toBe("other");
    expect(steps.slice(1).map((s) => breathCue(s.text))).toEqual(["in", "hold", "out"]);
    expect(breathingAt(steps, 3)).toMatchObject({ inPrep: true, step: steps[0] });
    // 10 s set-up, then a 12 s round: 24 s is round 2, 2 s into "inhale".
    expect(breathingAt(steps, 24)).toMatchObject({ inPrep: false, roundIndex: 1, index: 0, stepElapsed: 2, step: steps[1] });
  });

  it("uses the breath type picked in the portal over the words", () => {
    const r = toRoutine({
      id: 3,
      name: "Calm breathing",
      type: "Breathing",
      steps: [
        { instruction: "Get comfortable", breath: "setup", duration_seconds: 8 },
        // The words alone would be read as "other"; the portal says breathe in.
        { instruction: "Fill your belly slowly", breath: "in", duration_seconds: 4 },
        { instruction: "Let it go", breath: "out", duration_seconds: 6 },
        { instruction: "Inhale", breath: "nonsense", duration_seconds: 4 },
      ],
    });
    // "Get comfortable" is set-up, done once before the timer; the breaths repeat.
    expect(r.setup.map((s) => s.text)).toEqual(["Get comfortable"]);
    expect(r.steps.map(stepCue)).toEqual(["in", "out", "in"]);
    expect(r.steps[2].breath).toBeUndefined();
    expect(breathingAt(r.steps, 5)).toMatchObject({ inPrep: false, step: r.steps[1] });
  });

  it("pauses workouts on a critical score or a recent severe symptom, but never breathing", () => {
    expect(isWorkoutPaused({ hss_score: 42, hss_tier: "Elevated Risk" }, "cardio")).toBe(true);
    expect(isWorkoutPaused({ hss_score: 80, hss_tier: "Critical" }, "steps")).toBe(true);
    expect(isWorkoutPaused({ hss_score: 80, has_recent_severe_symptom: true }, "guide")).toBe(true);
    expect(isWorkoutPaused({ hss_score: 42, has_recent_severe_symptom: true }, "breathing")).toBe(false);
    expect(isWorkoutPaused({ hss_score: 72, hss_tier: "Stable" }, "cardio")).toBe(false);
    // No score yet (0) is not treated as critical.
    expect(isWorkoutPaused({ hss_score: 0 }, "cardio")).toBe(false);
  });

  it("counts time from the clock and leaves out pauses", () => {
    const start = 1_000_000;
    // Started, paused after 40 s for 25 s, now 70 s after the start: 45 s exercised.
    expect(elapsedSeconds({ startedAt: start, pausedAt: null, pausedMs: 25_000 }, start + 70_000)).toBe(45);
    // While paused the time stands still.
    expect(elapsedSeconds({ startedAt: start, pausedAt: start + 40_000, pausedMs: 0 }, start + 90_000)).toBe(40);
  });

  it("writes times the way the screens show them", () => {
    expect(formatClock(252)).toBe("4:12");
    expect(formatClock(5)).toBe("0:05");
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(252)).toBe("4 min 12 s");
    expect(formatDuration(600)).toBe("10 min");
  });
});
