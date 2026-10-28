import React from "react";
import { render, screen } from "@testing-library/react-native";
import { FoodWarning, RecipeRow } from "../ExploreBits";
import { toExploreRecipe } from "../../../services/explore";

// A recipe that clashes with the patient's allergies or diet says so wherever it shows, in place of "Dietitian approved".

const sinigang = toExploreRecipe({
  id: "r1",
  name: "Sinigang na Hipon",
  sodium_mg: 420,
  warnings: ["Contains shrimp (you're allergic to shellfish)", "Contains shrimp (not Vegetarian)"],
});

it("shows the first warning on a recipe row instead of the approval line", async () => {
  await render(<RecipeRow recipe={sinigang} onPress={jest.fn()} />);
  expect(screen.getByText("Contains shrimp (you're allergic to shellfish)")).toBeOnTheScreen();
  expect(screen.queryByText("Dietitian approved")).toBeNull();
  expect(screen.getByRole("button", { name: /Warning: Contains shrimp \(you're allergic to shellfish\)/ })).toBeOnTheScreen();
});

it("keeps the approval line when the recipe suits the patient", async () => {
  await render(<RecipeRow recipe={toExploreRecipe({ id: "r2", name: "Chicken Tinola" })} onPress={jest.fn()} />);
  expect(screen.getByText("Dietitian approved")).toBeOnTheScreen();
  expect(screen.queryByText(/Contains/)).toBeNull();
});

it("lists every warning in the recipe page banner", async () => {
  await render(<FoodWarning warnings={sinigang.warnings} />);
  expect(screen.getByText("Check before you eat this")).toBeOnTheScreen();
  expect(screen.getByText("Contains shrimp (not Vegetarian)")).toBeOnTheScreen();
});

it("shows nothing without warnings", async () => {
  await render(<FoodWarning warnings={[]} />);
  expect(screen.queryByText("Check before you eat this")).toBeNull();
});
