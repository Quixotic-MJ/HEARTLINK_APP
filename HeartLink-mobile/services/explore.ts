/**
 * Explore: the patient's picks, the browse-by-need lists and saved items. Built from the recipes and
 * exercises the server sends, which are only the approved ones (HL-026 / HL-037).
 */

export type ExploreRecipe = {
  id: string;
  title: string;
  category: string;
  sodiumMg: number;
  calories: number;
  prepMinutes: number;
  image: string;
  tier: string;
  /** What clashes with the patient's allergies or diet, e.g. "Contains shrimp (you're allergic to shellfish)". */
  warnings: string[];
};

export type ExploreExercise = {
  id: string;
  title: string;
  type: string;
  minutes: number;
  intensity: string;
  position: string | null;
  tier: string;
  /** HL-094: Beginner, Intermediate or Advanced; empty when not set. */
  level: string;
  image?: string;
};

type RawRow = Record<string, unknown>;
const text = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v : fallback);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

export function toExploreRecipe(r: RawRow): ExploreRecipe {
  return {
    id: String(r.id),
    title: text(r.name, "Recipe"),
    category: text(r.category_other, text(r.category, "Meal")),
    sodiumMg: Math.round(num(r.sodium_mg)),
    calories: Math.round(num(r.calories)),
    prepMinutes: num(r.prep_time_minutes),
    image: text(r.image_url),
    tier: text(r.hss_tier, "Stable"),
    warnings: foodWarnings(r.warnings),
  };
}

/** The server's allergy and diet warnings for a recipe (none from an older server or for a signed-out user). */
export function foodWarnings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((w): w is string => typeof w === "string" && !!w.trim()) : [];
}

export function toExploreExercise(r: RawRow): ExploreExercise {
  return {
    id: String(r.id),
    title: text(r.name, "Exercise"),
    type: text(r.type, "General"),
    minutes: num(r.duration_minutes),
    intensity: text(r.intensity, "Low"),
    position: text(r.position) || null,
    tier: text(r.hss_tier, "Stable"),
    level: text(r.difficulty_level),
    image: text(r.media_url, text(r.image_url)),
  };
}

/**
 * Same rule as the dashboard's suggestions: items for the patient's level, plus ones for everyone
 * (Stable). With no score yet, only the Stable ones.
 */
export function suitsTier(itemTier: string, patientTier?: string | null): boolean {
  const tier = patientTier && patientTier !== "Unknown" ? patientTier : "Stable";
  return itemTier === tier || itemTier === "Stable";
}

export type NeedId = "low-sodium" | "quick" | "seated" | "breathing";

export const SODIUM_LIMIT_MG = 300;
export const QUICK_MINUTES = 15;

export const NEEDS: Record<NeedId, { title: string; blurb: string; intro: string; kind: "recipe" | "exercise" }> = {
  "low-sodium": {
    title: "Low-sodium meals",
    blurb: `Under ${SODIUM_LIMIT_MG} mg`,
    intro: `Dietitian-approved meals under ${SODIUM_LIMIT_MG} mg of sodium per serving that suit your score. Lowest first.`,
    kind: "recipe",
  },
  quick: {
    title: "Quick meals",
    blurb: `Ready in ${QUICK_MINUTES} minutes`,
    intro: `Dietitian-approved meals you can make in ${QUICK_MINUTES} minutes or less that suit your score.`,
    kind: "recipe",
  },
  seated: {
    title: "Seated exercises",
    blurb: "Done in a chair",
    intro: "PT-approved exercises you can do sitting down. Your exercise safety check decides which ones are open to you.",
    kind: "exercise",
  },
  breathing: {
    title: "Breathing",
    blurb: "To calm down",
    intro: "PT-approved breathing exercises. They're open to everyone, whatever your safety check says.",
    kind: "exercise",
  },
};

export const NEED_IDS = Object.keys(NEEDS) as NeedId[];

// shortcut: most exercises have no position set yet, so "Chair"/"Seated" in the name also counts;
// drop the name check once PTs fill in Position for every exercise.
const isSeated = (e: ExploreExercise) => e.position === "Seated" || /\b(chair|seated)\b/i.test(e.title);

export function recipesForNeed(need: NeedId, recipes: ExploreRecipe[], tier?: string | null): ExploreRecipe[] {
  const mine = recipes.filter((r) => suitsTier(r.tier, tier));
  if (need === "low-sodium") return mine.filter((r) => r.sodiumMg < SODIUM_LIMIT_MG).sort((a, b) => a.sodiumMg - b.sodiumMg);
  if (need === "quick") return mine.filter((r) => r.prepMinutes > 0 && r.prepMinutes <= QUICK_MINUTES).sort((a, b) => a.prepMinutes - b.prepMinutes);
  return [];
}

/**
 * HL-123: the exercise safety check (PAR-Q+) decides which exercises are open, never the score, so these lists don't
 * filter by score level. `exerciseOk` is the safety check's rule (exerciseAllowed); breathing is always open.
 */
export function exercisesForNeed(
  need: NeedId,
  exercises: ExploreExercise[],
  exerciseOk: (e: ExploreExercise) => boolean = () => true
): { open: ExploreExercise[]; heldBack: number } {
  const all =
    need === "seated" ? exercises.filter(isSeated) : need === "breathing" ? exercises.filter((e) => e.type === "Breathing") : [];
  const open = all.filter(exerciseOk);
  return { open, heldBack: all.length - open.length };
}

type Recommendation = { id: string | number; type: string };

/**
 * "Picked for you": the dashboard's own suggestions (they also respect the patient's diet and
 * allergies), looked up in the approved lists. Without them, the lowest-sodium meals and the first
 * exercises that suit the score.
 */
export function picksForScore(
  recommendations: Recommendation[] | undefined,
  recipes: ExploreRecipe[],
  exercises: ExploreExercise[],
  tier?: string | null,
  count = 2,
  /** HL-057: "recipe:<id>" / "exercise:<id>" a clinician marked not suitable for this patient. */
  hidden: string[] = [],
  /** HL-123: which exercises the safety check allows. The score never decides this. */
  exerciseOk: (e: ExploreExercise) => boolean = () => true
): { recipes: ExploreRecipe[]; exercises: ExploreExercise[] } {
  exercises = exercises.filter(exerciseOk);
  if (hidden.length) {
    recipes = recipes.filter((r) => !hidden.includes(`recipe:${r.id}`));
    exercises = exercises.filter((e) => !hidden.includes(`exercise:${e.id}`));
  }
  if (recommendations?.length) {
    const ids = (type: string) => recommendations.filter((r) => r.type === type).map((r) => String(r.id));
    const recipeIds = ids("recipe");
    const exerciseIds = ids("exercise");
    return {
      recipes: recipeIds.map((id) => recipes.find((r) => r.id === id)).filter((r): r is ExploreRecipe => !!r).slice(0, count),
      exercises: exerciseIds.map((id) => exercises.find((e) => e.id === id)).filter((e): e is ExploreExercise => !!e).slice(0, count),
    };
  }
  return {
    // Never pick a meal that clashes with the patient's allergies or diet
    recipes: recipesForNeed("low-sodium", recipes, tier).filter((r) => !r.warnings.length).slice(0, count),
    exercises: exercises.slice(0, count),
  };
}

/** One plain sentence on why a pick suits the patient, from its own numbers. */
export function pickReason(item: { kind: "recipe"; recipe: ExploreRecipe } | { kind: "exercise"; exercise: ExploreExercise }): string {
  if (item.kind === "recipe") {
    const r = item.recipe;
    if (r.sodiumMg < SODIUM_LIMIT_MG) return `Low in sodium at ${r.sodiumMg} mg, so it leaves room in your day.`;
    if (r.prepMinutes > 0 && r.prepMinutes <= QUICK_MINUTES) return `Ready in ${r.prepMinutes} minutes.`;
    return "Made for your score level.";
  }
  const e = item.exercise;
  if (e.type === "Breathing") return "Slow breathing to help you relax.";
  if (isSeated(e)) return "Gentle and done sitting down.";
  if (e.intensity === "None" || e.intensity === "Low") return `Gentle effort for ${e.minutes} minutes.`;
  return `${e.minutes} minutes at ${e.intensity.toLowerCase()} effort.`;
}

/** Picks in one swipeable row: meal, exercise, meal, exercise. */
export function interleavePicks(picks: { recipes: ExploreRecipe[]; exercises: ExploreExercise[] }) {
  const out: ({ kind: "recipe"; recipe: ExploreRecipe } | { kind: "exercise"; exercise: ExploreExercise })[] = [];
  for (let i = 0; i < Math.max(picks.recipes.length, picks.exercises.length); i++) {
    if (picks.recipes[i]) out.push({ kind: "recipe", recipe: picks.recipes[i] });
    if (picks.exercises[i]) out.push({ kind: "exercise", exercise: picks.exercises[i] });
  }
  return out;
}

export const recipeLine = (r: ExploreRecipe) => `${r.sodiumMg} mg sodium, ${r.prepMinutes} min`;
export const exerciseLine = (e: ExploreExercise) =>
  [e.position === "Seated" ? "Seated" : e.type, `${e.minutes} min`, e.intensity === "None" ? "" : `${e.intensity.toLowerCase()} effort`]
    .filter(Boolean)
    .join(", ");
