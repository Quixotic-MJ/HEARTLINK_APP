import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LogSymptomsScreen from "../../../app/(home)/(health)/log-symptoms";

// HL-166 / HL-167 (panel revisions): the check-in has an optional oxygen reading with a safety check, and no longer
// asks about medicine.

const mockMutate = jest.fn((_payload: unknown) => Promise.resolve({}));
const mockToast = jest.fn();

jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "user-1", token: "t" }) }));
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: mockToast }) }));
jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn(() => Promise.resolve({ ok: false, json: async () => ({}) })) }));
jest.mock("../../../hooks/useLogVitals", () => ({
  useLogVitals: () => ({ mutateAsync: mockMutate }),
  wasQueued: () => false,
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <LogSymptomsScreen />
    </SafeAreaProvider>,
  );
}

describe("Check-in: oxygen and no medicine question", () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockToast.mockClear();
  });

  it("doesn't ask about medicine any more", async () => {
    await renderScreen();
    expect(screen.queryByText("Medicines today")).not.toBeOnTheScreen();
    expect(screen.queryByRole("radio", { name: "I took them" })).not.toBeOnTheScreen();
  });

  it("shows a 'get checked' note at 92% and saves the reading", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole("button", { name: "Add your oxygen, optional" }));
    await user.type(screen.getByLabelText("Blood oxygen in percent"), "92");
    expect(screen.getByText(/92% is lower than usual/)).toBeOnTheScreen();
    expect(screen.queryByText("This may be a medical emergency")).not.toBeOnTheScreen();
    await user.type(screen.getByLabelText("Top number, systolic, in mmHg"), "120");
    await user.type(screen.getByLabelText("Bottom number, diastolic, in mmHg"), "80");
    await user.press(screen.getByRole("button", { name: "Save check-in" }));
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ spo2_percent: 92, systolic_bp: 120 }));
    expect(mockMutate.mock.calls[0][0]).not.toHaveProperty("medication_taken");
  });

  it("opens the emergency guidance under 90%", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole("button", { name: "Add your oxygen, optional" }));
    await user.type(screen.getByLabelText("Blood oxygen in percent"), "88");
    expect(screen.getByText("This may be a medical emergency")).toBeOnTheScreen();
    expect(screen.getByText("Your oxygen level is very low (88%, under 90%).")).toBeOnTheScreen();
    expect(screen.getByText("Your oxygen is very low")).toBeOnTheScreen();
  });
});
