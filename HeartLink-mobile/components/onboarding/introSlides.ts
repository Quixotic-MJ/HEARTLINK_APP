// 2026-11-25 (UI/UX redesign): the swipe-through starting screen. Each slide says one thing every user gets (no
// heart risk here: that is for ages 30 to 79 only). Each slide has the team's illustration; icon art is the fallback.

export type IntroTint = "lavender" | "sky" | "peach" | "mint";

export interface IntroSlide {
  key: string;
  title: string;
  text: string;
  tint: IntroTint;
  /** MaterialCommunityIcons name; the first slide shows the HeartLink logo instead */
  icon: string | null;
  /** Two small labels floating around the picture (only when there's no illustration yet) */
  chips: [string, string];
  /** The team's illustration (assets/images/intro/), shown instead of the icon art when there is one */
  image?: number;
  /** The illustration's own background colour, so the picture has no visible edge */
  imageBg?: string;
  /** "cover" fills the picture area (may trim the top and bottom); "contain" shows the whole picture */
  fit?: "cover" | "contain";
}

export const INTRO_SLIDES: IntroSlide[] = [
  {
    key: "welcome",
    title: "Welcome to HeartLink",
    text: "Small daily habits for a healthier heart, for adults who want to look after it.",
    tint: "lavender",
    icon: null,
    chips: ["Blood pressure", "Meals and moves"],
    image: require("../../assets/images/intro/intro-1-welcome.png"),
    imageBg: "#e5e3f8",
  },
  {
    key: "numbers",
    title: "Know your numbers",
    text: "Log your blood pressure in seconds and see your week at a glance.",
    tint: "sky",
    icon: "heart-pulse",
    chips: ["128/82", "Pulse 72"],
    image: require("../../assets/images/intro/intro-2-numbers.png"),
    imageBg: "#dbecfc",
  },
  {
    key: "food",
    title: "Eat with less salt",
    text: "Recipes with sodium per serving, approved by a dietitian.",
    tint: "peach",
    icon: "silverware-fork-knife",
    chips: ["380 mg sodium", "Dietitian approved"],
    image: require("../../assets/images/intro/intro-3-food.png"),
    imageBg: "#ffe3cb",
  },
  {
    key: "move",
    title: "Move at your level",
    text: "Exercises that suit you, after a quick safety check.",
    tint: "mint",
    icon: "walk",
    chips: ["Breathing", "Beginner walk"],
    // A tall full-body picture: show all of it so the head and feet aren't trimmed
    image: require("../../assets/images/intro/intro-4-move.png"),
    imageBg: "#dcf7e8",
    fit: "contain",
  },
];

/** What the bottom buttons do on each slide: first = Continue, middle = Skip and Next, last = Get started. */
export function introButtons(index: number, count = INTRO_SLIDES.length): "continue" | "skip-next" | "get-started" {
  if (index >= count - 1) return "get-started";
  return index === 0 ? "continue" : "skip-next";
}

/** The slide shown for a scroll position (the pages are one screen wide). */
export function slideAt(offsetX: number, width: number, count = INTRO_SLIDES.length): number {
  if (!width) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offsetX / width)));
}
