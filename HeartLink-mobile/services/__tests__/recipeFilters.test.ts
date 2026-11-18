import { matchesMeal } from "../recipeFilters";

describe("Recipes tab meal chips", () => {
  const lunch = { category: "Lunch", tags: ["Low sodium"] };
  const taggedDinner = { category: "", tags: ["Dinner"] };

  it("matches the recipe's meal category, which is how the portal saves it", () => {
    expect(matchesMeal(lunch, "Lunch")).toBe(true);
    expect(matchesMeal(lunch, "Breakfast")).toBe(false);
    expect(matchesMeal({ category: " lunch " }, "Lunch")).toBe(true);
  });

  it("still counts a meal word in the tags", () => {
    expect(matchesMeal(taggedDinner, "Dinner")).toBe(true);
  });

  it("shows everything under All, even a recipe with no meal", () => {
    expect(matchesMeal({}, "All")).toBe(true);
    expect(matchesMeal({}, "Breakfast")).toBe(false);
  });
});
