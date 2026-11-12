import React from "react";
import { render as rtlRender, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ExploreTabScreen from "../../../app/(home)/(tabs)/explore";
import { toExploreExercise, toExploreRecipe } from "../../../services/explore";

// Explore's "Picked for you" follows Today: under 50 (a critical score) there are no picks.

let mockScore: { score: number | null; tier: string | null } = { score: 72, tier: "Moderate" };
const mockRecipes = [toExploreRecipe({ id: "r1", name: "Grilled Bangus", sodium_mg: 95, prep_time_minutes: 20, hss_tier: "Stable" })];
const mockExercises = [toExploreExercise({ id: "e1", name: "Paced Breathing", type: "Breathing", duration_minutes: 5, hss_tier: "Stable" })];
const mockSaved = { ids: [], refetch: jest.fn(), toggle: jest.fn() };

jest.mock("../../../hooks/useExploreData", () => ({
  useExploreRecipes: () => ({ data: mockRecipes, isLoading: false, refetch: jest.fn() }),
  useExploreExercises: () => ({ data: mockExercises, isLoading: false, refetch: jest.fn() }),
  useExploreScore: () => ({
    data: { ...mockScore, recommendations: [], hidden: [], screening: null, resting: false },
    refetch: jest.fn(),
  }),
  useSavedRecipes: () => mockSaved,
  useSavedExercises: () => mockSaved,
}));
jest.mock("../../../hooks/useRefetchOnFocus", () => ({ useRefetchOnFocus: () => {} }));
jest.mock("../../../components/Header", () => ({ Header: () => null }));
jest.mock("../../../components/meals/MealPlanCard", () => ({ MealPlanCard: () => null }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderExplore() {
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <ExploreTabScreen />
    </SafeAreaProvider>,
  );
}

describe("Explore › Picked for you", () => {
  it("shows picks for a score of 50 or more", async () => {
    mockScore = { score: 72, tier: "Moderate" };
    await renderExplore();
    expect(screen.getByRole("button", { name: /^Meal: Grilled Bangus/ })).toBeOnTheScreen();
    expect(screen.queryByText("Picks are paused for now")).toBeNull();
  }, 20000);

  it("pauses picks under 50, as Today does, and keeps the lists", async () => {
    mockScore = { score: 42, tier: "Critical" };
    await renderExplore();
    expect(screen.getByText("Picks are paused for now")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Meal: Grilled Bangus/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Low-sodium meals/ })).toBeOnTheScreen();
  }, 20000);
});
