import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HealthCheckScreen from "../../../app/(baseline)/health-check";

// HL-164 (panel revision): the conditions HeartLink isn't made for, asked before setup. A tick shows the advice not to
// use the app; the person can sign out, or go on only with their doctor's OK.

const mockReplace = jest.fn();
const mockUpdate = jest.fn();
const mockLogout = jest.fn(() => Promise.resolve());

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
}));
jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ logout: mockLogout }) }));
jest.mock("../../../contexts/BaselineContext", () => ({
  useBaseline: () => ({
    data: { health_check_done: false, health_conditions: [], doctor_cleared: false },
    updateData: mockUpdate,
  }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <HealthCheckScreen />
    </SafeAreaProvider>,
  );
}

const checkbox = (name: RegExp) => screen.getByRole("checkbox", { name });

describe("Health check before setup", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockUpdate.mockReset();
    mockLogout.mockClear();
  });

  it("goes on to setup when none of these apply", async () => {
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.press(checkbox(/^Heart disease/));
    await user.press(checkbox(/^None of these/));
    // "None of these" clears the others
    expect(checkbox(/^Heart disease/)).not.toBeChecked();
    await user.press(screen.getByRole("button", { name: "Continue" }));
    expect(mockUpdate).toHaveBeenCalledWith({ health_check_done: true, health_conditions: [], doctor_cleared: false });
    expect(mockReplace).toHaveBeenCalledWith("/(baseline)/plan");
  });

  it("advises against using the app, and goes on only with the doctor's OK", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(checkbox(/^Kidney disease/));
    await user.press(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("HeartLink isn't made for your condition")).toBeOnTheScreen();
    expect(screen.getByText(/You told us you have kidney disease\./)).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();

    const goOn = screen.getByRole("button", { name: "Continue with my doctor's OK" });
    expect(goOn).toBeDisabled();
    await user.press(checkbox(/My doctor said I can use HeartLink/));
    await user.press(goOn);
    expect(mockUpdate).toHaveBeenCalledWith({
      health_check_done: true,
      health_conditions: ["kidney_disease"],
      doctor_cleared: true,
    });
    expect(mockReplace).toHaveBeenCalledWith("/(baseline)/plan");
  });

  it("signs out without saving anything", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(checkbox(/^I'm pregnant/));
    await user.press(screen.getByRole("button", { name: "Continue" }));
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  });
});
