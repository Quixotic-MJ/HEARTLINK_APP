import React from "react";
import { render as rtlRender, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import MealPlanScreen from "../../../app/(home)/(meals)/meal-plan";
import MealPlanChangeScreen from "../../../app/(home)/(meals)/meal-plan-change";
import { createTestQueryClient, queryClientWrapper } from "../../../test-utils/reactQuery";

// HL-159: changing single meals in the week's plan (Premium): another approved recipe, "My own meal", or the plan's
// pick back; "Undo my changes" asks first.

jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "user-1" }) }));
const mockShowToast = jest.fn();
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: mockShowToast }) }));
let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const SCREEN_TEST_MS = 20000;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const recipe = (id: string, name: string, sodium: number) => ({ id, name, image_url: null, sodium_mg: sodium, calories: 300 });

function planDay(date: string) {
  return {
    date,
    sodium_mg: 1210,
    meals: [
      { meal: "Breakfast", recipe: recipe("b1", "Oatmeal with banana", 90), kind: "plan", saved: true },
      { meal: "Lunch", recipe: recipe("l2", "Chicken tinola", 400), kind: "swap" },
      { meal: "Dinner", recipe: null, kind: "own", own: { name: "Lola's sinigang", sodium_mg: 720, calories: 450 } },
    ],
  };
}

function plan(changes: number) {
  const days = Array.from({ length: 7 }, (_, i) => planDay(`2026-11-${String(16 + i).padStart(2, "0")}`));
  return {
    week_start: "2026-11-16", shuffle: 0, sodium_limit_mg: 1500, meal_budget_mg: 1200,
    recipes_available: { Breakfast: 2, Lunch: 3, Dinner: 2 }, days, shopping_list: [], note: "A plan to help.", changes,
  };
}

function respond(routes: Record<string, unknown>) {
  (apiFetch as jest.Mock).mockImplementation(async (url: string, init?: { method?: string }) => {
    const key = `${init?.method ?? "GET"} ${url.split("?")[0]}`;
    const body = routes[key];
    return { ok: body !== undefined, status: body === undefined ? 500 : 200, json: async () => body ?? {} };
  });
}

async function renderScreen(Screen: React.ComponentType) {
  const Wrapper = queryClientWrapper(createTestQueryClient());
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper>
        <Screen />
      </Wrapper>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  (apiFetch as jest.Mock).mockReset();
  mockShowToast.mockReset();
  mockPush.mockReset();
  mockBack.mockReset();
  mockParams = {};
});

describe("Your week's meals", () => {
  it("shows your pick, your estimate and saved recipes, and Change opens that meal", async () => {
    const user = userEvent.setup();
    respond({ "GET /api/meal-plan": plan(2) });
    await renderScreen(MealPlanScreen);
    expect(await screen.findByText("Your pick")).toBeOnTheScreen();
    expect(screen.getByText("Your estimate")).toBeOnTheScreen();
    expect(screen.getByText("720 mg sodium")).toBeOnTheScreen();
    expect(screen.getByText("Saved")).toBeOnTheScreen();
    expect(screen.queryByText(/Dietitian approved/)).toBeNull();
    await user.press(screen.getByRole("button", { name: "Change lunch" }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/(home)/(meals)/meal-plan-change", params: expect.objectContaining({ meal: "Lunch", shuffle: "0" }) }),
    );
  }, SCREEN_TEST_MS);

  it("asks before undoing the week's changes", async () => {
    const user = userEvent.setup();
    respond({ "GET /api/meal-plan": plan(2), "DELETE /api/meal-plan/changes": {} });
    await renderScreen(MealPlanScreen);
    await user.press(await screen.findByRole("button", { name: "Undo my changes" }));
    expect(screen.getByText("Undo your changes?")).toBeOnTheScreen();
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining("/changes"), expect.anything());
    await user.press(screen.getByRole("button", { name: /^Undo$/ }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/meal-plan\/changes\?week=/), { method: "DELETE" }));
  }, SCREEN_TEST_MS);

  it("has no Undo when nothing was changed", async () => {
    respond({ "GET /api/meal-plan": plan(0) });
    await renderScreen(MealPlanScreen);
    await screen.findByText("Shopping list");
    expect(screen.queryByRole("button", { name: "Undo my changes" })).toBeNull();
  }, SCREEN_TEST_MS);
});

describe("Change a meal", () => {
  const options = (list: ReturnType<typeof recipe>[], kind = "plan") => ({
    date: "2026-11-17",
    meal: "Lunch",
    room_mg: 450,
    current: { meal: "Lunch", recipe: recipe("l1", "Garlic tofu", 250), kind },
    options: list.map((r, i) => ({ ...r, saved: i === 0 })),
  });

  it("lists recipes that fit the day and swaps one in", async () => {
    const user = userEvent.setup();
    mockParams = { date: "2026-11-17", meal: "Lunch", shuffle: "3" };
    respond({ "GET /api/meal-plan/options": options([recipe("l9", "Pinakbet", 180), recipe("l2", "Chicken tinola", 400)]), "PUT /api/meal-plan/changes": {} });
    await renderScreen(MealPlanChangeScreen);
    expect(await screen.findByText("Change Tuesday's lunch")).toBeOnTheScreen();
    expect(await screen.findByText(/Up to 450 mg sodium for this meal/)).toBeOnTheScreen();
    expect((apiFetch as jest.Mock).mock.calls[0][0]).toBe("/api/meal-plan/options?date=2026-11-17&meal=Lunch&shuffle=3");
    expect(screen.queryByRole("button", { name: "Put back the plan's pick" })).toBeNull(); // nothing changed yet
    await user.press(screen.getByRole("button", { name: /^Pinakbet, 180 mg sodium, saved/ }));
    const put = (apiFetch as jest.Mock).mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(put[1].body)).toEqual({ date: "2026-11-17", meal: "Lunch", recipe_id: "l9" });
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Plan updated", type: "success" }));
  }, SCREEN_TEST_MS);

  it("offers My own meal, and the plan's pick back when the meal was changed", async () => {
    const user = userEvent.setup();
    mockParams = { date: "2026-11-17", meal: "Lunch", shuffle: "0" };
    respond({ "GET /api/meal-plan/options": options([], "swap"), "DELETE /api/meal-plan/changes": {} });
    await renderScreen(MealPlanChangeScreen);
    expect(await screen.findByText("Nothing else fits this day's sodium. Try My own meal.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Estimate my own meal" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/(home)/(meals)/estimate-meal", params: { plan_date: "2026-11-17", plan_meal: "Lunch" } });
    await user.press(screen.getByRole("button", { name: "Put back the plan's pick" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/meal-plan/changes?date=2026-11-17&meal=Lunch", { method: "DELETE" }));
  }, SCREEN_TEST_MS);
});
