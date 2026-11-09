import { exerciseAllowed, isWorkoutPaused, needsScreening, pauseReason } from "../exerciseSession";
import { picksForScore, toExploreExercise } from "../explore";

const screen = (state: string, extra: Record<string, unknown> = {}) => ({
  hss_score: 90,
  hss_tier: "Stable",
  exercise_screening: { answered: state !== "needed", paused: state === "locked" || state === "delayed", state, reason: null },
  ...extra,
});

describe("pauseReason (HL-123): the safety check decides, never the score", () => {
  it("leaves every workout open when Eligible", () => {
    expect(pauseReason(screen("eligible"), "cardio", "Advanced")).toBeNull();
    expect(pauseReason(screen("eligible"), "steps", "")).toBeNull();
  });

  it("allows only beginner workouts when Eligible with caution", () => {
    expect(pauseReason(screen("caution"), "cardio", "Beginner")).toBeNull();
    expect(pauseReason(screen("caution"), "cardio", "Intermediate")).toBe("beginner_only");
    expect(pauseReason(screen("caution"), "steps", "")).toBe("beginner_only");
  });

  it("pauses active workouts when Locked or Delayed, but never breathing", () => {
    expect(pauseReason(screen("locked"), "cardio", "Beginner")).toBe("locked");
    expect(pauseReason(screen("delayed"), "guide", "Beginner")).toBe("delayed");
    expect(pauseReason(screen("locked"), "breathing")).toBeNull();
    expect(pauseReason(screen("delayed"), "breathing")).toBeNull();
  });

  it("pauses after an emergency-level reading and after a severe symptom, whatever the result", () => {
    expect(pauseReason(screen("eligible", { emergency_reading_pause: true }), "cardio", "Beginner")).toBe("emergency_reading");
    expect(pauseReason(screen("eligible", { has_recent_severe_symptom: true }), "cardio", "Beginner")).toBe("symptom");
    expect(pauseReason(screen("eligible", { emergency_reading_pause: true }), "breathing")).toBeNull();
  });

  it("ignores the score once the server sends a result", () => {
    expect(pauseReason(screen("eligible", { hss_score: 42, hss_tier: "Critical" }), "cardio", "Advanced")).toBeNull();
  });

  it("doesn't pause a workout that needs the check: starting it opens the check instead", () => {
    const needed = screen("needed", { exercise_screening: { answered: false, paused: false, state: "needed", reason: "expired" } });
    expect(isWorkoutPaused(needed, "cardio", "Beginner")).toBe(false);
    expect(needsScreening(needed, "cardio")).toBe(true);
    expect(needsScreening(needed, "breathing")).toBe(false);
    expect(needsScreening(screen("eligible"), "cardio")).toBe(false);
  });

  it("keeps the earlier rule for an older server with no result", () => {
    expect(pauseReason({ hss_score: 42, hss_tier: "Elevated Risk" }, "cardio")).toBe("score");
    expect(pauseReason({ hss_score: 80, exercise_screening: { answered: true, paused: true } }, "cardio")).toBe("locked");
    expect(pauseReason({ hss_score: 80, exercise_screening: { answered: true, paused: false } }, "cardio")).toBeNull();
    expect(needsScreening({ exercise_screening: { answered: false, paused: false } }, "cardio")).toBe(true);
  });
});

describe("exerciseAllowed (HL-123): what the lists show", () => {
  const easy = { type: "Light Cardio", level: "Beginner" };
  const harder = { type: "Light Cardio", level: "Intermediate" };
  const breathing = { type: "Breathing", level: "" };

  it("follows each result", () => {
    const allowed = (state: string) => [easy, harder, breathing].map((e) => exerciseAllowed({ answered: true, paused: false, state }, e));
    expect(allowed("eligible")).toEqual([true, true, true]);
    expect(allowed("caution")).toEqual([true, false, true]);
    expect(allowed("locked")).toEqual([false, false, true]);
    expect(allowed("delayed")).toEqual([false, false, true]);
    expect(allowed("needed")).toEqual([false, false, true]);
  });

  it("works with an older server", () => {
    expect(exerciseAllowed({ answered: true, paused: true }, harder)).toBe(false);
    expect(exerciseAllowed(null, harder)).toBe(true);
  });
});

describe("Explore picks follow the safety check (HL-123)", () => {
  const ex = (id: string, type: string, difficulty_level: string, hss_tier = "Stable") =>
    toExploreExercise({ id, name: id, type, duration_minutes: 10, intensity: "Low", difficulty_level, hss_tier });
  const exercises = [ex("walk", "Light Cardio", "Intermediate"), ex("easy", "Light Cardio", "Beginner", "Critical"), ex("calm", "Breathing", "")];

  it("reads each exercise's level", () => {
    expect(exercises.map((e) => e.level)).toEqual(["Intermediate", "Beginner", ""]);
  });

  it("only picks what the result allows, and not by score level", () => {
    const caution = { answered: true, paused: false, state: "caution" };
    const picks = picksForScore([], [], exercises, "Stable", 5, [], (e) => exerciseAllowed(caution, e));
    expect(picks.exercises.map((e) => e.id)).toEqual(["easy", "calm"]);
    const all = picksForScore([], [], exercises, "Critical", 5);
    expect(all.exercises.map((e) => e.id)).toEqual(["walk", "easy", "calm"]);
  });
});
