import { amountText, dayShort, daySodiumLine, itemLine, shoppingText, thisWeek } from "../mealPlan";

// HL-155: the meal plan's wording and the shopping list.

const ITEM = { name: "Rolled oats", unit: "cup", amount: 1.75, recipes: ["Oatmeal with banana"] };

describe("meal plan wording", () => {
  it("names days and the day's sodium plainly", () => {
    expect(dayShort("2026-11-16")).toBe("Mon");
    expect(daySodiumLine({ date: "2026-11-16", meals: [], sodium_mg: 1050 }, 1500)).toBe(
      "About 1,050 mg sodium from these meals; your daily limit is 1,500 mg.",
    );
  });

  it("finds this week's Monday", () => {
    expect(thisWeek(new Date(2026, 10, 19, 9))).toBe("2026-11-16"); // a Thursday
    expect(thisWeek(new Date(2026, 10, 22, 21))).toBe("2026-11-16"); // Sunday belongs to the week before
    expect(thisWeek(new Date(2026, 10, 16, 0, 5))).toBe("2026-11-16");
  });
});

describe("shopping list", () => {
  it("scales amounts for more people, to 2 decimals at most", () => {
    expect(amountText(1.75)).toBe("1.75");
    expect(amountText(1.75, 2)).toBe("3.5");
    expect(amountText(0.333, 3)).toBe("1");
    expect(itemLine(ITEM, 4)).toBe("Rolled oats: 7 cup");
    expect(itemLine({ ...ITEM, amount: 0, unit: "" })).toBe("Rolled oats");
  });

  it("shares as plain text", () => {
    expect(shoppingText({ week_start: "2026-11-16", shopping_list: [ITEM] }, 2)).toBe(
      "HeartLink shopping list, week of Monday, Nov 16 (2 people)\n\n• Rolled oats: 3.5 cup",
    );
  });
});
