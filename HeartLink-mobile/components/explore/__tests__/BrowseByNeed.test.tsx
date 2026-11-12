import React from "react";
import { render as rtlRender, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import BrowseByNeedScreen from "../../../app/(home)/(meals)/browse";
import { toExploreExercise, toExploreRecipe } from "../../../services/explore";

// HL-123: Explore › Browse by need follows the exercise safety check, not the score, and leaves out what the care
// team hid (HL-057).

const mockScore = { tier: "Moderate", screening: { answered: true, paused: false, state: "caution" }, hidden: ["exercise:march"] };
const exercise = (id: string, name: string, level: string, tier = "Stable") =>
  toExploreExercise({ id, name, type: "Stationary", position: "Seated", duration_minutes: 10, intensity: "Low", hss_tier: tier, difficulty_level: level });
const mockExercises = [
  exercise("easy", "Seated Arm Circles", "Beginner", "Critical"), // a different score level: still shown
  exercise("hard", "Seated Leg Press", "Intermediate"),
  exercise("march", "Seated March", "Beginner"),
];
const mockRecipes = [
  toExploreRecipe({ id: "oats", name: "Oatmeal", sodium_mg: 10, prep_time_minutes: 10, hss_tier: "Stable", category: "Breakfast" }),
];

let mockNeed = "seated";
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ need: mockNeed }),
}));

jest.mock("../../../hooks/useExploreData", () => ({
  useExploreRecipes: () => ({ data: mockRecipes, isLoading: false }),
  useExploreExercises: () => ({ data: mockExercises, isLoading: false }),
  useExploreScore: () => ({ data: mockScore }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderNeed(need: string) {
  mockNeed = need;
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <BrowseByNeedScreen />
    </SafeAreaProvider>,
  );
}

describe("Browse by need (HL-123)", () => {
  it("shows the seated exercises the safety check allows, whatever their score level", async () => {
    await renderNeed("seated");
    expect(screen.getByText("Seated Arm Circles")).toBeOnTheScreen();
    expect(screen.queryByText("Seated Leg Press")).toBeNull(); // caution: Beginner only
    expect(screen.queryByText("Seated March")).toBeNull(); // hidden by the care team
    expect(screen.getByText(/1 more exercise opens when your exercise safety check allows it/)).toBeOnTheScreen();
    expect(screen.queryByText(/suit your score/)).toBeNull();
  });

  it("still lists meals", async () => {
    await renderNeed("low-sodium");
    expect(screen.getByText("Oatmeal")).toBeOnTheScreen();
  });
});
