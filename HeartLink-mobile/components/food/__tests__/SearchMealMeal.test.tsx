import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SearchMealScreen from "../../../app/(home)/(meals)/search-meal";
import type { FoodItem } from "../../../services/foodLogging";

// 2026-11-18: Add food asks which meal it is (the clock's by default), lists that meal's recipes first with every other
// recipe below, and takes the choice on to review.

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "p1", token: "t" }) }));

const recipe = (id: string, name: string, category: string): FoodItem => ({
  id,
  source: "recipe",
  name,
  recipe_id: id,
  category,
  base: { sodium_mg: 300, calories: 350, saturated_fat_g: 1, fiber_g: 2 },
});
jest.mock("../../../services/foodSearch", () => ({
  fetchRecentMeals: jest.fn(async () => []),
  fetchRecipes: jest.fn(async () => [
    recipe("d1", "Grilled bangus", "Dinner"),
    recipe("b1", "Arroz caldo", "Breakfast"),
    recipe("l1", "Chicken tinola", "Lunch"),
  ]),
  searchPackagedFoods: jest.fn(async () => []),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <SearchMealScreen />
    </SafeAreaProvider>,
  );

const TIMEOUT = 20000;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe("Add food: which meal", () => {
  it(
    "lists the chosen meal's recipes first and every other recipe below",
    async () => {
      mockParams = { meal: "Lunch" };
      await renderScreen();
      await waitFor(() => expect(screen.getByRole("header", { name: "Lunch recipes" })).toBeOnTheScreen(), { timeout: 3000 });
      expect(screen.getByRole("header", { name: "More recipes" })).toBeOnTheScreen();
      expect(screen.getByRole("radio", { name: "Lunch" })).toBeSelected();
      expect(screen.getByText("Chicken tinola")).toBeOnTheScreen();
      expect(screen.getByText("Arroz caldo")).toBeOnTheScreen();
      expect(screen.getByText("Grilled bangus")).toBeOnTheScreen();
    },
    TIMEOUT,
  );

  it(
    "switches to Breakfast and takes the choice on to review",
    async () => {
      const user = userEvent.setup();
      mockParams = { meal: "Dinner" };
      await renderScreen();
      await waitFor(() => expect(screen.getByRole("header", { name: "Dinner recipes" })).toBeOnTheScreen(), { timeout: 3000 });

      await user.press(screen.getByRole("radio", { name: "Breakfast" }));
      expect(screen.getByRole("header", { name: "Breakfast recipes" })).toBeOnTheScreen();

      await user.press(screen.getByRole("checkbox", { name: /Arroz caldo/ }));
      await user.press(screen.getByRole("button", { name: "Review 1 food" }));
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: "/(home)/(meals)/multi-log-review", params: expect.objectContaining({ meal: "Breakfast" }) }),
      );
    },
    TIMEOUT,
  );

  it(
    "keeps one plain recipe list for a snack",
    async () => {
      mockParams = { meal: "Snack" };
      await renderScreen();
      await waitFor(() => expect(screen.getByText("Chicken tinola")).toBeOnTheScreen(), { timeout: 3000 });
      expect(screen.queryByRole("header", { name: "More recipes" })).toBeNull();
    },
    TIMEOUT,
  );
});
