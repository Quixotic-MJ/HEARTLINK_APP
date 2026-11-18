import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LegalScreen from "../../../app/legal";
import { PRIVACY, TERMS } from "../../../constants/legal";

// The Terms of Service and Privacy Policy live inside the app (2026-11-18), not on a website the team doesn't own.

let mockParams: Record<string, string> = {};
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
  useLocalSearchParams: () => mockParams,
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <LegalScreen />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockCanGoBack = true;
});

describe("Terms of Service and Privacy Policy", () => {
  it("shows the Terms by default, marked as a draft, with every section", async () => {
    await renderScreen();
    expect(screen.getByRole("header", { name: "Terms of Service" })).toBeOnTheScreen();
    expect(screen.getByText(/pending our adviser's review/)).toBeOnTheScreen();
    for (const section of TERMS.sections) {
      expect(screen.getByRole("header", { name: section.heading })).toBeOnTheScreen();
    }
    expect(screen.getByText(/call 911/)).toBeOnTheScreen();
  });

  it("shows the Privacy Policy, including the outside services and the Data Privacy Act rights", async () => {
    mockParams = { doc: "privacy" };
    await renderScreen();
    expect(screen.getByRole("header", { name: "Privacy Policy" })).toBeOnTheScreen();
    for (const section of PRIVACY.sections) {
      expect(screen.getByRole("header", { name: section.heading })).toBeOnTheScreen();
    }
    expect(screen.getByText(/Groq: an AI service/)).toBeOnTheScreen();
    expect(screen.getByText(/National Privacy Commission \(privacy\.gov\.ph\)/)).toBeOnTheScreen();
  });

  it("goes back, or to sign-in when it was opened on its own", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole("button", { name: "Go back" }));
    expect(mockBack).toHaveBeenCalledTimes(1);

    mockCanGoBack = false;
    await user.press(screen.getByRole("button", { name: "Go back" }));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });
});
