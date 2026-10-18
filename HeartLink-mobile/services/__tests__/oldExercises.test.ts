import { buildTimeline, checklistFor, exerciseKind, routineSeconds, toRoutine } from "../exerciseSession";
import { segmentIntro } from "../../hooks/useExerciseTimeline";

// Exercises saved before the new layout, as they are in the database: the app has to work out
// their position, sections and timing so the checks and the voice make sense.

const labels = (r: ReturnType<typeof toRoutine>) => checklistFor(r).map((i) => i.label);

describe("old exercises", () => {
  it("a walk asks for a safe route, not a chair, and knows its warm-up and cool-down", () => {
    const walk = toRoutine({
      id: "w",
      name: "20-Minute Neighborhood Walk",
      type: "Light Cardio",
      duration_minutes: 20,
      requirements: ["Comfortable walking shoes", "Water bottle"],
      steps: [
        { instruction: "Warm up with light stretching.", duration_seconds: 120 },
        { instruction: "Walk at a comfortable, conversational pace.", duration_seconds: 900 },
        { instruction: "Cool down with a slower pace.", duration_seconds: 180 },
      ],
    });
    expect(walk.position).toBe("Walking");
    expect(labels(walk)).toEqual(["A safe, flat route", "Comfortable walking shoes", "Water bottle"]);
    expect(walk.steps.map((s) => s.section)).toEqual(["warmup", "main", "cooldown"]);
    const t = buildTimeline(walk);
    // The step already says "warm up", so the voice doesn't say it twice.
    expect(segmentIntro(t[0], undefined)).toBe("Warm up with light stretching");
    expect(segmentIntro(t[1], t[0])).toBe("Now the main part. Walk at a comfortable, conversational pace");
  });

  it("seated and lying exercises don't ask for shoes or something to hold", () => {
    const pumps = toRoutine({
      id: "a",
      name: "Light Ankle Pumps",
      type: "Stationary",
      duration_minutes: 5,
      steps: [
        { instruction: "Sit comfortably with feet flat on the floor.", duration_seconds: 10 },
        { instruction: "Lift your heels, then lower.", duration_seconds: 60, details: "Follow the instructions carefully" },
        { instruction: "Lift your toes, then lower.", duration_seconds: 60 },
        { instruction: "Repeat for 5 minutes continuously.", duration_seconds: 300 },
      ],
    });
    expect(pumps.position).toBe("Seated");
    expect(labels(pumps)).toEqual(["Water within reach", "A sturdy chair without wheels"]);
    // "Repeat for 5 minutes" isn't a step: the two moves repeat in rounds instead of adding 5 minutes.
    expect(pumps.steps.map((s) => s.text)).toEqual(["Lift your heels, then lower.", "Lift your toes, then lower."]);
    expect(pumps.rounds).toBe(3);
    // Placeholder details aren't read out at every step.
    expect(pumps.steps[0].details).toBe("");

    const lying = toRoutine({
      id: "d",
      name: "Deep Diaphragmatic Breathing",
      type: "Breathing",
      duration_minutes: 10,
      steps: [
        { instruction: "Lie flat on your back with a pillow under your knees.", duration_seconds: 10 },
        { instruction: "Breathe in slowly through your nose.", duration_seconds: 4 },
        { instruction: "Let it out as you exhale.", duration_seconds: 6 },
      ],
    });
    expect(lying.position).toBe("Lying down");
    expect(labels(lying)).toEqual(["Water within reach", "A mat or bed to lie on"]);
  });

  it("a relaxation saved as Breathing, with no breaths in it, plays step by step", () => {
    const relax = toRoutine({
      id: "r",
      name: "Guided Seated Relaxation",
      type: "Breathing",
      duration_minutes: 10,
      steps: [
        { instruction: "Close eyes and focus on natural breathing.", duration_seconds: 60 },
        { instruction: "Progressively relax muscles from head to toe.", duration_seconds: 120 },
        { instruction: "Remain still and observe thoughts.", duration_seconds: 120 },
      ],
    });
    expect(exerciseKind(relax)).toBe("steps");
    expect(relax.position).toBe("Seated");
    expect(routineSeconds(relax)).toBe(600);
  });

  it("the same item isn't asked for twice", () => {
    const stretches = toRoutine({
      id: "s",
      name: "Basic Standing Stretches",
      type: "Stationary",
      duration_minutes: 10,
      requirements: ["Space to stand", "Comfortable clothing"],
      steps: [{ instruction: "Reach arms overhead and hold.", duration_seconds: 15 }],
    });
    expect(stretches.position).toBe("Standing");
    expect(labels(stretches)).toEqual(["Water within reach", "A sturdy chair or wall nearby", "Space to stand", "Comfortable clothing"]);
  });
});

describe("pictures added under Extra pictures", () => {
  const base = {
    id: "l",
    name: "Seated Leg Lifts",
    type: "Stationary",
    duration_minutes: 6,
    steps: [
      { instruction: "March gently in place", section: "warmup", duration_seconds: 60 },
      { instruction: "Lift one leg straight out", section: "main", mode: "count", reps: 10, seconds_per_rep: 3, both_sides: true },
      { instruction: "Rest your feet and breathe", section: "cooldown", duration_seconds: 30 },
    ],
    guide_images: ["https://x/1.jpg", "https://x/2.jpg", "https://x/3.jpg", "https://x/4.jpg"],
  };

  it("are given to the steps in order when there's one per step", () => {
    const r = toRoutine({ ...base, setup_steps: [{ instruction: "Sit near the front of a sturdy chair" }] });
    expect(r.setup[0].image).toBe("https://x/1.jpg");
    expect(r.steps.map((s) => s.image)).toEqual(["https://x/2.jpg", "https://x/3.jpg", "https://x/4.jpg"]);
  });

  it("are not guessed when the count doesn't match the steps", () => {
    const r = toRoutine(base); // 4 pictures, 3 steps, no set-up
    expect(r.steps.every((s) => !s.image)).toBe(true);
  });
});
