import React from "react";
import { render as rtlRender, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import { LongTermTrends } from "../LongTermTrends";
import type { LongTermMetric } from "../LongTermTrends";
import { createTestQueryClient, queryClientWrapper } from "../../../test-utils/reactQuery";

// HL-086: the 90-day and 1-year Trends, for a Premium and a free patient.

jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "user-1" }) }));
jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));

const empty = {
  score: null,
  systolic: null,
  diastolic: null,
  readings: 0,
  pulse: null,
  sodium_mg: null,
  sodium_days: 0,
  days_over_limit: 0,
  exercise_minutes_per_week: 0,
  sleep_hours: null,
  medicines_percent: null,
};

const DATA = {
  days: 90,
  bucket: "week",
  period: { start: "2026-07-29", end: "2026-10-27" },
  sodium_limit_mg: 1500,
  buckets: [
    { ...empty, label: "Oct 14", start: "2026-10-14", end: "2026-10-20", systolic: 135, diastolic: 87, readings: 4, score: 72 },
    { ...empty, label: "Oct 21", start: "2026-10-21", end: "2026-10-27" },
  ],
  month_compare: {
    this: { ...empty, start: "2026-09-28", end: "2026-10-27", systolic: 135, diastolic: 87, readings: 10 },
    last: { ...empty, start: "2026-08-29", end: "2026-09-27", systolic: 132, diastolic: 86, readings: 3 },
  },
  time_of_day: [
    { key: "morning", label: "Morning", hours: "5 to 11 AM", systolic: 135, diastolic: 87, readings: 10 },
    { key: "afternoon", label: "Afternoon", hours: "11 AM to 5 PM", systolic: null, diastolic: null, readings: 0 },
    { key: "evening", label: "Evening", hours: "5 to 10 PM", systolic: 120, diastolic: 80, readings: 1 },
    { key: "night", label: "Night", hours: "10 PM to 5 AM", systolic: null, diastolic: null, readings: 0 },
  ],
  patterns: [
    {
      key: "sodium",
      text: "On average, your top number the next day was 10 higher after days over your sodium limit than after days under it (140 and 130).",
      with: { label: "Over your limit", systolic: 140, days: 5 },
      without: { label: "Under your limit", systolic: 130, days: 6 },
      difference: 10,
    },
  ],
  pattern_min_days: 5,
  disclaimer: "Patterns show what tends to happen together in your logs, not what causes it. They aren't a diagnosis.",
};

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderView(metric: LongTermMetric = "bp", days: 90 | 365 = 90) {
  const Wrapper = queryClientWrapper(createTestQueryClient());
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper>
        <LongTermTrends days={days} metric={metric} />
      </Wrapper>
    </SafeAreaProvider>,
  );
}

const respond = (body: unknown, status = 200) =>
  (apiFetch as jest.Mock).mockResolvedValue({ ok: status === 200, status, json: async () => body });

describe("Long-term Trends", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  it("shows a Premium patient's weeks, this month vs last, time of day and pattern notes", async () => {
    respond(DATA);
    await renderView("bp");
    expect(await screen.findByText("Average for the week of Oct 14")).toBeOnTheScreen();
    expect(screen.getByText("This month vs last")).toBeOnTheScreen();
    expect(screen.getByText("Up 3 mmHg")).toBeOnTheScreen();
    expect(screen.getByText("By time of day")).toBeOnTheScreen();
    expect(screen.getAllByText("No readings")).toHaveLength(2);
    expect(screen.getByText(/10 higher after days over your sodium limit/)).toBeOnTheScreen();
    expect(screen.getByText("Based on 5 days over your limit and 6 days under it.")).toBeOnTheScreen();
    expect(screen.getByText(/aren't a diagnosis/)).toBeOnTheScreen();
    expect((apiFetch as jest.Mock).mock.calls[0][0]).toBe("/api/analytics/user-1/long-term?days=90");
  });

  it("says how many days pattern notes need when there aren't enough yet", async () => {
    respond({ ...DATA, patterns: [] });
    await renderView("score", 365);
    expect(await screen.findByText(/at least 5 days on each side/)).toBeOnTheScreen();
    expect((apiFetch as jest.Mock).mock.calls[0][0]).toBe("/api/analytics/user-1/long-term?days=365");
  });

  it("offers to log when a measure has nothing in the period", async () => {
    respond(DATA);
    await renderView("sodium");
    expect(await screen.findByText("No meals logged in the last 90 days")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Log a meal" })).toBeOnTheScreen();
  });

  it("tells a free patient it's part of Premium", async () => {
    respond({ detail: { code: "premium_required", message: "This is a HeartLink Premium feature." } }, 403);
    await renderView();
    expect(await screen.findByText("Trends over months")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "See HeartLink Premium" })).toBeOnTheScreen();
    expect(screen.queryByText("This month vs last")).toBeNull();
  });
});
