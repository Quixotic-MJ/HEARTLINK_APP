import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import OnboardingScreen from "../../../app/onboarding";
import { INTRO_SLIDES, introButtons, slideAt } from "../introSlides";

// 2026-11-25 (UI/UX redesign): the swipe-through starting screen.

// The screen loads the app's stylesheet, which Jest can't read; the styles don't matter here
jest.mock("../../../global.css", () => ({}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <OnboardingScreen />
    </SafeAreaProvider>,
  );
}

describe("Swipe-through intro", () => {
  beforeEach(() => mockPush.mockReset());

  it("knows which buttons each slide shows and which slide a scroll lands on", () => {
    expect(INTRO_SLIDES).toHaveLength(4);
    expect([0, 1, 2, 3].map((i) => introButtons(i))).toEqual(["continue", "skip-next", "skip-next", "get-started"]);
    expect(slideAt(0, 390)).toBe(0);
    expect(slideAt(400, 390)).toBe(1);
    expect(slideAt(5000, 390)).toBe(3);
    expect(slideAt(100, 0)).toBe(0);
  });

  it("goes from Continue to Skip and Next, then Get started", async () => {
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.getByText("Welcome to HeartLink")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByRole("button", { name: "Next" })).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Skip" }));
    await user.press(screen.getByRole("button", { name: /Get started/ }));
    expect(mockPush).toHaveBeenCalledWith("/who-its-for");
  });

  it("keeps Log in on every slide, and the disclaimer", async () => {
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.getByText("For tracking and prevention. Not a diagnosis.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Log in" }));
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
