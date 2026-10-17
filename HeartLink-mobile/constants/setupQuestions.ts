/**
 * The set-up questions, one per screen, in the order they are asked.
 * Rendered by app/(baseline)/question/[id].tsx. The option values are the exact values the
 * backend already accepts (see app/(baseline)/score.tsx for the payload), so the score
 * model gets the same inputs as the old 6-step form.
 */
import type { BaselineData } from "../contexts/BaselineContext";
import type { BadgeTint, McIcon } from "../components/onboarding/QuestionLayout";
import type { ChoiceOption } from "../components/onboarding/Controls";

export type PartNumber = 1 | 2 | 3 | 4;

export interface SetupPart {
  n: PartNumber;
  name: string;
  summary: string;
  tint: BadgeTint;
  icon: McIcon;
}

export const SETUP_PART_LIST: SetupPart[] = [
  { n: 1, name: "About you", summary: "Name, birthday, sex, height, weight", tint: "sky", icon: "account-outline" },
  { n: 2, name: "Movement", summary: "Exercise, walking, sitting time", tint: "mint", icon: "walk" },
  { n: 3, name: "Habits", summary: "Sleep, smoking, alcohol", tint: "lavender", icon: "weather-night" },
  { n: 4, name: "Food & goals", summary: "Meals, salt, goals, allergies", tint: "peach", icon: "leaf" },
];

type BooleanField = "vigorous_activity" | "moderate_activity" | "walk_bike_transport" | "ever_smoked" | "ever_drank";
type ChoiceField =
  | "sex"
  | "sedentary_hours"
  | "sleep_hours"
  | "smoke_now"
  | "drink_frequency"
  | "drinks_per_occasion"
  | "binge_drinking_freq"
  | "diet_level"
  | "fruit_veg_servings"
  | "fried_food_freq"
  | "salty_food_freq"
  | "dietary_practice";
type DaysField = "vigorous_days" | "moderate_days" | "walk_bike_days";
type MinutesField = "vigorous_minutes" | "moderate_minutes" | "walk_bike_minutes";

interface QuestionBase {
  id: string;
  part: PartNumber;
  title: string;
  subtitle?: string;
  why?: string;
  note?: string;
  icon?: McIcon;
  /** A small grey tag shown instead of the icon, for follow-up questions. */
  tag?: string;
  /** Hide the question unless this returns true (follow-ups). */
  showIf?: (d: BaselineData) => boolean;
}

export type SetupQuestion =
  | (QuestionBase & { kind: "name" })
  | (QuestionBase & { kind: "dob" })
  | (QuestionBase & { kind: "body" })
  | (QuestionBase & { kind: "choice"; field: ChoiceField; options: ChoiceOption[] })
  | (QuestionBase & { kind: "tiles"; field: ChoiceField; options: ChoiceOption[]; caption: string })
  | (QuestionBase & { kind: "yesno"; field: BooleanField; days?: DaysField; minutes?: MinutesField; yesHint?: string })
  | (QuestionBase & { kind: "goals"; options: ChoiceOption[] })
  | (QuestionBase & { kind: "allergies"; options: ChoiceOption[] });

const HOW_OFTEN: ChoiceOption[] = [
  { value: "rarely", label: "Rarely" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
  { value: "daily", label: "Daily" },
];

const drinks = (d: BaselineData) => d.ever_drank === true;

export const SETUP_QUESTIONS: SetupQuestion[] = [
  // ── Part 1 · About you ──
  { id: "name", part: 1, kind: "name", icon: "account-outline", title: "What should we call you?", subtitle: "Your first name is enough." },
  {
    id: "dob",
    part: 1,
    kind: "dob",
    icon: "calendar-blank-outline",
    title: "When were you born?",
    subtitle: "Tap to open the date picker.",
    why: "Heart risk changes with age, so your score is set for yours.",
  },
  {
    id: "sex",
    part: 1,
    kind: "choice",
    field: "sex",
    icon: "account-outline",
    title: "What was your sex at birth?",
    subtitle: "This is about the body, not identity.",
    why: "Heart risk and healthy ranges differ a little between male and female bodies.",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
  },
  {
    id: "body",
    part: 1,
    kind: "body",
    icon: "ruler",
    title: "How tall are you, and how much do you weigh?",
    subtitle: "A rough number is fine.",
    why: "Height and weight give your body mass index (BMI), one part of your score.",
  },

  // ── Part 2 · Movement ──
  {
    id: "vigorous",
    part: 2,
    kind: "yesno",
    field: "vigorous_activity",
    days: "vigorous_days",
    minutes: "vigorous_minutes",
    icon: "lightning-bolt-outline",
    title: "Do you do hard exercise that makes you breathe hard or sweat?",
    subtitle: "Running, fast cycling, HIIT or heavy lifting, for 10 minutes or more.",
    yesHint: "If you choose Yes, we'll ask how many days and for how long.",
    why: "Regular exercise strengthens the heart and helps keep blood pressure down.",
  },
  {
    id: "moderate",
    part: 2,
    kind: "yesno",
    field: "moderate_activity",
    days: "moderate_days",
    minutes: "moderate_minutes",
    icon: "run",
    title: "Do you do moderate activity that raises your heart rate a little?",
    subtitle: "Brisk walking, light cycling, yard work or swimming, for 10 minutes or more.",
  },
  {
    id: "walk",
    part: 2,
    kind: "yesno",
    field: "walk_bike_transport",
    days: "walk_bike_days",
    minutes: "walk_bike_minutes",
    icon: "bike",
    title: "Do you walk or bike to get places, for 10 minutes or more?",
    subtitle: "To work, school, errands or the jeepney stop.",
    note: "Everyday movement counts too, not just workouts.",
  },
  {
    id: "sitting",
    part: 2,
    kind: "choice",
    field: "sedentary_hours",
    icon: "seat-outline",
    title: "On a typical day, how long do you sit or rest?",
    subtitle: "Desk work, driving, screens, studying and relaxing. Not sleep.",
    note: "Long sitting days affect the heart, even for people who exercise.",
    options: [
      { value: "<2h", label: "Less than 2 hours" },
      { value: "2-4h", label: "2 to 4 hours" },
      { value: "4-6h", label: "4 to 6 hours" },
      { value: "6-8h", label: "6 to 8 hours" },
      { value: "8+h", label: "More than 8 hours" },
    ],
  },

  // ── Part 3 · Habits ──
  {
    id: "sleep",
    part: 3,
    kind: "choice",
    field: "sleep_hours",
    icon: "weather-night",
    title: "How many hours do you usually sleep at night?",
    subtitle: "Think about a normal week.",
    why: "Regular short sleep is linked to higher blood pressure. Your answer helps set where your score starts.",
    options: [
      { value: "5", label: "Less than 5 hours" },
      { value: "5-6", label: "5 to 6 hours" },
      { value: "7-8", label: "7 to 8 hours" },
      { value: "9", label: "9 hours or more" },
    ],
  },
  {
    id: "ever-smoked",
    part: 3,
    kind: "yesno",
    field: "ever_smoked",
    icon: "smoking",
    title: "Have you ever smoked regularly?",
    subtitle: "That means at least 100 cigarettes in your life, about 5 packs.",
    yesHint: "If you choose Yes, we'll ask if you still smoke.",
    why: "Smoking history is one of the strongest factors in heart health.",
  },
  {
    id: "smoke-now",
    part: 3,
    kind: "choice",
    field: "smoke_now",
    tag: "Because you said you've smoked",
    title: "Do you smoke now?",
    subtitle: "Cigarettes, vapes or other tobacco.",
    note: "Quitting lowers heart risk over time. This tells us where you are now.",
    showIf: (d) => d.ever_smoked === true,
    options: [
      { value: "Every day", label: "Yes, every day" },
      { value: "Some days", label: "Yes, on some days" },
      { value: "Not at all", label: "No, I've quit" },
    ],
  },
  {
    id: "alcohol",
    part: 3,
    kind: "yesno",
    field: "ever_drank",
    icon: "glass-wine",
    title: "Do you drink alcohol?",
    subtitle: "Beer, wine, cocktails, spirits, tuba or lambanog.",
    yesHint: "If you choose Yes, we'll ask 3 short follow-ups. No skips them.",
    why: "Alcohol affects blood pressure and heart rhythm.",
  },
  {
    id: "alcohol-often",
    part: 3,
    kind: "choice",
    field: "drink_frequency",
    tag: "Alcohol · 1 of 3",
    title: "How often do you have a drink with alcohol?",
    subtitle: "Think about a typical month.",
    showIf: drinks,
    options: [
      { value: "Monthly or less", label: "Monthly or less" },
      { value: "2-4x/month", label: "2 to 4 times a month" },
      { value: "2-3x/week", label: "2 to 3 times a week" },
      { value: "4+/week", label: "4 or more times a week" },
    ],
  },
  {
    id: "alcohol-amount",
    part: 3,
    kind: "choice",
    field: "drinks_per_occasion",
    tag: "Alcohol · 2 of 3",
    title: "On a day you drink, how many drinks do you usually have?",
    subtitle: "One drink is a bottle of beer, a glass of wine or one shot.",
    showIf: drinks,
    options: [
      { value: "1-2", label: "1 or 2 drinks" },
      { value: "3-4", label: "3 or 4 drinks" },
      { value: "5+", label: "5 or more drinks" },
    ],
  },
  {
    id: "alcohol-heavy",
    part: 3,
    kind: "choice",
    field: "binge_drinking_freq",
    tag: "Alcohol · 3 of 3",
    title: "How often do you have 6 or more drinks at one time?",
    subtitle: "At a party, a celebration or a night out.",
    showIf: drinks,
    options: [
      { value: "Never", label: "Never" },
      { value: "Monthly or less", label: "Monthly or less" },
      { value: "2-4x/month", label: "2 to 4 times a month" },
      { value: "2-3x/week", label: "2 to 3 times a week" },
      { value: "4+/week", label: "4 or more times a week" },
    ],
  },

  // ── Part 4 · Food & goals ──
  {
    id: "portions",
    part: 4,
    kind: "choice",
    field: "diet_level",
    icon: "silverware-fork-knife",
    title: "How big are your usual meals?",
    subtitle: "Think about most days, not special occasions.",
    note: "Portion size affects how much salt and fat you get in a day.",
    options: [
      { value: "light", label: "Light", desc: "Smaller, lighter meals" },
      { value: "average", label: "Moderate", desc: "Balanced, average meals" },
      { value: "heavy", label: "Substantial", desc: "Larger, filling meals" },
      { value: "very_heavy", label: "Heavy", desc: "Often large, hearty meals" },
    ],
  },
  {
    id: "produce",
    part: 4,
    kind: "tiles",
    field: "fruit_veg_servings",
    caption: "servings",
    icon: "leaf",
    title: "How many servings of fruit and vegetables do you eat a day?",
    subtitle: "One serving is about a fist-sized piece or a cup of veggies.",
    why: "Fruit and vegetables bring potassium and fibre, which help blood pressure.",
    options: [
      { value: "0-1", label: "0–1" },
      { value: "2-3", label: "2–3" },
      { value: "4-5", label: "4–5" },
      { value: "6+", label: "6+" },
    ],
  },
  {
    id: "fried",
    part: 4,
    kind: "choice",
    field: "fried_food_freq",
    icon: "fire",
    title: "How often do you eat fried or fatty foods?",
    subtitle: "Fast food, fried dishes, lechon or fatty meats.",
    note: "Fried and fatty foods affect cholesterol.",
    options: HOW_OFTEN,
  },
  {
    id: "salty",
    part: 4,
    kind: "choice",
    field: "salty_food_freq",
    icon: "shaker-outline",
    title: "How often do you eat salty or processed foods?",
    subtitle: "Chips, instant noodles, canned and cured foods.",
    why: "Salt has a big effect on blood pressure. This helps set your daily sodium limit.",
    options: HOW_OFTEN,
  },
  {
    id: "goals",
    part: 4,
    kind: "goals",
    title: "What should HeartLink focus on?",
    subtitle: "Pick one or more. This shapes your daily missions.",
    options: [
      { value: "bp", label: "Blood pressure", desc: "Track, manage and steady your blood pressure" },
      { value: "cholesterol", label: "Cholesterol & lipids", desc: "Keep an eye on blood fats through food" },
      { value: "recovery", label: "Cardiac recovery", desc: "Pacing and rest after a heart event" },
      { value: "preventive", label: "Preventive longevity", desc: "General heart wellness and fitness" },
    ],
  },
  {
    id: "allergies",
    part: 4,
    kind: "allergies",
    icon: "alert-circle-outline",
    title: "Do you have any food allergies?",
    subtitle: "Pick all that apply. We'll leave these out of your recipes.",
    options: ["None", "Peanuts", "Shellfish", "Dairy", "Gluten", "Soy", "Eggs"].map((a) => ({ value: a, label: a })),
  },
  {
    id: "diet",
    part: 4,
    kind: "choice",
    field: "dietary_practice",
    icon: "format-list-bulleted",
    title: "Last one: do you follow a diet?",
    subtitle: "We'll only suggest recipes that fit.",
    options: [
      { value: "None", label: "No special diet" },
      { value: "Halal", label: "Halal" },
      { value: "Vegan", label: "Vegan" },
      { value: "Vegetarian", label: "Vegetarian" },
      { value: "Low-Carb", label: "Low-carb" },
    ],
  },
];

// ─── Dates ───────────────────────────────────────────────────────────────────
// Birthdays are stored as "YYYY-MM-DD" in the phone's own time zone. Converting through
// toISOString() (UTC) moved them a day back for users east of UTC, like the Philippines.

export function toYMD(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Reads "YYYY-MM-DD" as a local date. Returns null if it isn't a real date. */
export function parseYMD(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function formatDob(value: string): string {
  const date = parseYMD(value);
  return date ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";
}

export function ageFrom(value: string): number | null {
  const d = parseYMD(value);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isShown(q: SetupQuestion, d: BaselineData): boolean {
  return q.showIf ? q.showIf(d) : true;
}

export function visibleQuestions(d: BaselineData, part?: PartNumber): SetupQuestion[] {
  return SETUP_QUESTIONS.filter((q) => (part ? q.part === part : true) && isShown(q, d));
}

export function questionById(id: string): SetupQuestion | undefined {
  return SETUP_QUESTIONS.find((q) => q.id === id);
}

export function partOf(n: PartNumber): SetupPart {
  return SETUP_PART_LIST[n - 1];
}

const validHeight = (v: string) => {
  const h = parseFloat(v);
  return !isNaN(h) && h >= 50 && h <= 300;
};
const validWeight = (v: string) => {
  const w = parseFloat(v);
  return !isNaN(w) && w >= 20 && w <= 400;
};

/** True when the question has a usable answer (same rules as the old form). */
export function isAnswered(q: SetupQuestion, d: BaselineData): boolean {
  switch (q.kind) {
    case "name":
      return d.first_name.trim().length > 0;
    case "dob": {
      const age = ageFrom(d.date_of_birth);
      return age !== null && age >= 0 && age <= 120;
    }
    case "body":
      return validHeight(d.height_cm) && validWeight(d.weight_kg);
    case "choice":
    case "tiles":
      return !!d[q.field];
    case "yesno": {
      const v = d.answered?.[q.field];
      if (!v) return false;
      if (d[q.field] && q.days && q.minutes) {
        return parseInt(d[q.days] || "0", 10) >= 1 && parseInt(d[q.minutes] || "0", 10) >= 1;
      }
      return true;
    }
    case "goals":
      return d.health_goals.length > 0;
    case "allergies":
      return d.allergies.length > 0;
  }
}

export function isPartDone(n: PartNumber, d: BaselineData): boolean {
  return visibleQuestions(d, n).every((q) => isAnswered(q, d));
}

/** First unanswered visible question, for resuming. */
export function firstOpenQuestion(d: BaselineData): SetupQuestion | undefined {
  return visibleQuestions(d).find((q) => !isAnswered(q, d));
}
