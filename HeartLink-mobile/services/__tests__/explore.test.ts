import { exercisesForNeed, interleavePicks, pickReason, picksForScore, recipesForNeed, suitsTier, toExploreExercise, toExploreRecipe } from "../explore";

const recipe = (id: string, sodium: number, prep: number, tier = "Stable") =>
  toExploreRecipe({ id, name: id, sodium_mg: sodium, prep_time_minutes: prep, hss_tier: tier, category: "Lunch" });
const exercise = (id: string, name: string, type: string, tier = "Stable", position: string | null = null) =>
  toExploreExercise({ id, name, type, duration_minutes: 10, intensity: "Low", hss_tier: tier, position });

describe("suitsTier", () => {
  it("allows the patient's level and Stable, like the dashboard", () => {
    expect(suitsTier("Moderate", "Moderate")).toBe(true);
    expect(suitsTier("Stable", "Moderate")).toBe(true);
    expect(suitsTier("Critical", "Moderate")).toBe(false);
  });

  it("only allows Stable items before there is a score", () => {
    expect(suitsTier("Stable", undefined)).toBe(true);
    expect(suitsTier("Critical", "Unknown")).toBe(false);
  });
});

describe("browse by need", () => {
  const recipes = [recipe("tinola", 380, 35), recipe("oatmeal", 10, 10), recipe("tofu", 220, 15, "Moderate"), recipe("broth", 90, 45, "Critical")];

  it("lists low-sodium meals for the patient's level, lowest first", () => {
    expect(recipesForNeed("low-sodium", recipes, "Moderate").map((r) => r.id)).toEqual(["oatmeal", "tofu"]);
  });

  it("lists quick meals of 15 minutes or less", () => {
    expect(recipesForNeed("quick", recipes, "Moderate").map((r) => r.id)).toEqual(["oatmeal", "tofu"]);
  });

  it("finds seated and breathing exercises", () => {
    const exercises = [
      exercise("yoga", "15-Minute Chair Yoga", "Stationary"),
      exercise("lifts", "Leg Lifts", "Stationary", "Stable", "Seated"),
      exercise("walk", "Neighborhood Walk", "Light Cardio"),
      exercise("breath", "Paced Breathing", "Breathing"),
      exercise("breath-critical", "Relaxation", "Breathing", "Critical"),
    ];
    expect(exercisesForNeed("seated", exercises, "Moderate").map((e) => e.id)).toEqual(["yoga", "lifts"]);
    expect(exercisesForNeed("breathing", exercises, "Moderate").map((e) => e.id)).toEqual(["breath"]);
  });
});

describe("picksForScore", () => {
  const recipes = [recipe("a", 300, 10), recipe("b", 50, 10)];
  const exercises = [exercise("x", "Walk", "Light Cardio")];

  it("uses the dashboard's suggestions and skips ones no longer in the approved list", () => {
    const picks = picksForScore([{ id: "a", type: "recipe" }, { id: "gone", type: "recipe" }, { id: "x", type: "exercise" }], recipes, exercises, "Stable");
    expect(picks.recipes.map((r) => r.id)).toEqual(["a"]);
    expect(picks.exercises.map((e) => e.id)).toEqual(["x"]);
  });

  it("falls back to the lowest-sodium meals without suggestions", () => {
    expect(picksForScore(undefined, recipes, exercises, "Stable").recipes.map((r) => r.id)).toEqual(["b"]);
  });
});

describe("pick cards", () => {
  it("explains each pick from its own numbers", () => {
    expect(pickReason({ kind: "recipe", recipe: recipe("tofu", 220, 15) })).toBe("Low in sodium at 220 mg, so it leaves room in your day.");
    expect(pickReason({ kind: "recipe", recipe: recipe("tinola", 380, 10) })).toBe("Ready in 10 minutes.");
    expect(pickReason({ kind: "exercise", exercise: exercise("yoga", "15-Minute Chair Yoga", "Stationary") })).toBe("Gentle and done sitting down.");
    expect(pickReason({ kind: "exercise", exercise: exercise("b", "Paced Breathing", "Breathing") })).toBe("Slow breathing to help you relax.");
  });

  it("alternates meals and exercises", () => {
    const row = interleavePicks({ recipes: [recipe("a", 10, 10), recipe("b", 10, 10)], exercises: [exercise("x", "Walk", "Light Cardio")] });
    expect(row.map((p) => (p.kind === "recipe" ? p.recipe.id : p.exercise.id))).toEqual(["a", "x", "b"]);
  });
});

describe("picksForScore with hidden items (HL-057)", () => {
  it("leaves out items a clinician marked not suitable", () => {
    const recipes = [recipe("r1", 100, 10), recipe("r2", 100, 10)];
    const exercises = [exercise("e1", "Walk", "Light Cardio"), exercise("e2", "Breathe", "Breathing")];
    const hidden = ["recipe:r1", "exercise:e2"];
    const fallback = picksForScore([], recipes, exercises, "Stable", 2, hidden);
    expect(fallback.recipes.map((r) => r.id)).toEqual(["r2"]);
    expect(fallback.exercises.map((e) => e.id)).toEqual(["e1"]);
    const fromDashboard = picksForScore([{ id: "r1", type: "recipe" }, { id: "r2", type: "recipe" }], recipes, exercises, "Stable", 2, hidden);
    expect(fromDashboard.recipes.map((r) => r.id)).toEqual(["r2"]);
  });
});

describe("allergy and diet warnings", () => {
  it("reads the server's warnings and ignores anything else", () => {
    expect(toExploreRecipe({ id: "a", warnings: ["Contains pork (not Halal)", 3, " "] }).warnings).toEqual(["Contains pork (not Halal)"]);
    expect(toExploreRecipe({ id: "b" }).warnings).toEqual([]);
  });

  it("never falls back to a meal that clashes with the patient's allergies or diet", () => {
    const recipes = [
      toExploreRecipe({ id: "shrimp", sodium_mg: 50, hss_tier: "Stable", warnings: ["Contains shrimp (you're allergic to shellfish)"] }),
      toExploreRecipe({ id: "tinola", sodium_mg: 120, hss_tier: "Stable" }),
    ];
    expect(picksForScore(undefined, recipes, [], "Stable").recipes.map((r) => r.id)).toEqual(["tinola"]);
  });
});
