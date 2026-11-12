import React from "react";
import { render as rtlRender, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import EstimateMealScreen from "../../../app/(home)/(meals)/estimate-meal";
import { logMealAndGetToast } from "../../../services/MealLoggingService";

// HL-157: Meals › Estimate a meal. "Help me estimate" fills the numbers from the dish, portion and hidden salt;
// "Use a food label" keeps the exact entry.

jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "user-1", token: "t" }) }));
const mockShowToast = jest.fn();
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: mockShowToast }) }));
jest.mock("../../../services/MealLoggingService", () => ({ logMealAndGetToast: jest.fn() }));
jest.mock("react-native-keyboard-aware-scroll-view", () => {
  const { ScrollView } = jest.requireActual("react-native");
  return { KeyboardAwareScrollView: ScrollView };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <EstimateMealScreen />
    </SafeAreaProvider>,
  );
}

// This screen re-draws its whole form on every tap and typed letter. Alone a test takes about 2 s, but in a full run
// (hundreds of tests at once) one took 4.3 s against Jest's 5 s limit and sometimes failed. Like the PAR-Q+ screen
// tests, these get 20 s; the taps and typing stay realistic (userEvent).
const SCREEN_TEST_MS = 20000;

const savedPayload = () => (logMealAndGetToast as jest.Mock).mock.calls[0][2];

describe("Estimate a meal (HL-157)", () => {
  beforeEach(() => {
    (logMealAndGetToast as jest.Mock).mockReset();
    mockShowToast.mockReset();
  });

  it("adds up the dish, the portion and the hidden salt, and saves them", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole("radio", { name: /^Fried rice \(no meat\)/ }));
    // the default portion is 1 cup: 530 mg
    expect(screen.getByText("About 530 mg sodium")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "More Soy sauce (toyo)" }));
    expect(screen.getByText("About 1,409 mg sodium")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Save meal" }));
    expect(savedPayload()).toMatchObject({
      meal_name: "Fried rice (no meat), 1 cup + 1 tbsp soy sauce (toyo)",
      portion: 1,
      sodium_mg: 1409,
      calories: 247, // 238.4 + 8.5
      source: "manual_entry",
    });
  }, SCREEN_TEST_MS);

  it("warns when the meal alone is over the daily sodium limit", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole("radio", { name: /^Instant noodles/ }));
    // 1 pack (the default) = 1,610 mg
    expect(screen.getByRole("checkbox", { name: "1 pack", checked: true })).toBeOnTheScreen();
    expect(screen.getByText(/more than a whole day's limit/)).toBeOnTheScreen();
  }, SCREEN_TEST_MS);

  it("keeps a name the patient typed", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.type(screen.getByPlaceholderText("e.g. Pork sinigang, lechon, mango"), "Lola's fried rice");
    await user.press(screen.getByRole("radio", { name: /^Fried rice \(no meat\)/ }));
    await user.press(screen.getByRole("button", { name: "Save meal" }));
    expect(savedPayload().meal_name).toBe("Lola's fried rice");
  }, SCREEN_TEST_MS);

  it("still takes exact numbers from a food label", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole("tab", { name: "Use a food label" }));
    await user.type(screen.getByPlaceholderText("e.g. Pork sinigang, lechon, mango"), "Crackers");
    await user.type(screen.getByLabelText("Sodium in mg"), "320");
    await user.type(screen.getByLabelText("Calories in kcal"), "140");
    await user.press(screen.getByRole("button", { name: "Save meal" }));
    expect(savedPayload()).toMatchObject({ meal_name: "Crackers", sodium_mg: 320, calories: 140, portion: 1 });
  }, SCREEN_TEST_MS);
});
