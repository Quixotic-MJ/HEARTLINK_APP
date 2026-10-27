import React from "react";
import { render as rtlRender, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import HealthReportScreen from "../../../app/(home)/(profile)/health-report";
import { createTestQueryClient, queryClientWrapper } from "../../../test-utils/reactQuery";

// HL-085: the health report screen, for a Premium and a free patient.

jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({ shareAsync: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({ cacheDirectory: "file://cache/", moveAsync: jest.fn() }));
jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "user-1", user: { first_name: "Ana" } }) }));
jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));

const REPORT = {
  days: 30,
  period: { start: "2026-09-27", end: "2026-10-27" },
  generated_at: "2026-10-27T08:00:00+00:00",
  days_logged: 21,
  blood_pressure: {
    readings: 3,
    average: { systolic: 133, diastolic: 85, readings: 3 },
    highest: { systolic: 150, diastolic: 95, date: "2026-10-17" },
    lowest: { systolic: 118, diastolic: 76, date: "2026-10-18" },
    morning: null,
    evening: null,
    categories: [],
  },
  pulse: { average: 75, readings: 2 },
  score: { start: 64, end: 71, change: 7 },
  medicines: { answered: 0, taken: 0, percent: null },
  sodium: { days_with_meals: 0, average_mg: null, limit_mg: 1500, days_over_limit: 0 },
  exercise: { sessions: 0, minutes: 0, minutes_per_week: 0 },
  sleep: { average_hours: null, nights: 0 },
  symptoms: [],
  alerts: [],
  disclaimer: "For discussion with your doctor. HeartLink is a wellness tool, not a diagnosis.",
};

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  const Wrapper = queryClientWrapper(createTestQueryClient());
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper>
        <HealthReportScreen />
      </Wrapper>
    </SafeAreaProvider>,
  );
}

describe("Health report", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  it("shows a Premium patient's report and offers the PDF", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => REPORT });
    await renderScreen();
    expect(await screen.findByText("133/85 mmHg")).toBeOnTheScreen();
    expect(screen.getByText("64 → 71 (+7)")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Share PDF" })).toBeOnTheScreen();
    expect(screen.getByText(/not a diagnosis/)).toBeOnTheScreen();
    expect((apiFetch as jest.Mock).mock.calls[0][0]).toBe("/api/reports/user-1?days=30");
  });

  it("tells a free patient it's part of Premium", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: { code: "premium_required", message: "This is a HeartLink Premium feature." } }),
    });
    await renderScreen();
    expect(await screen.findByRole("button", { name: "See HeartLink Premium" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Share PDF" })).toBeNull();
  });
});
