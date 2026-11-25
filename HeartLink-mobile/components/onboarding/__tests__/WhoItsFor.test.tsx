import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import WhoItsForScreen from "../../../app/(auth)/who-its-for";

// 2026-11-25 (panel revision): "Is HeartLink for you?" before sign-up, and from the welcome screen's link.

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { from?: string } = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <WhoItsForScreen />
    </SafeAreaProvider>,
  );
}

describe("Is HeartLink for you?", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockParams = {};
  });

  it("says who it's for and the conditions it isn't made for, then goes on to sign up", async () => {
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.getByText("Is HeartLink for you?")).toBeOnTheScreen();
    expect(screen.getByText("Want to keep your heart healthy")).toBeOnTheScreen();
    expect(screen.getByText("Are at risk and want to manage it")).toBeOnTheScreen();
    for (const condition of ["Heart disease", "Stroke or mini-stroke", "Kidney disease", "A pregnancy"]) {
      expect(screen.getByText(condition)).toBeOnTheScreen();
    }
    expect(screen.getByText(/talk to your doctor before using HeartLink/)).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: /This is me, continue/ }));
    expect(mockPush).toHaveBeenCalledWith("/register");
  });

  it("only reads, from the welcome screen's link", async () => {
    mockParams = { from: "welcome" };
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.queryByRole("button", { name: /This is me, continue/ })).toBeNull();
    await user.press(screen.getByRole("button", { name: "Got it" }));
    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
