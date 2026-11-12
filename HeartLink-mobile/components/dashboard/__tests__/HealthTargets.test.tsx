import React from "react";
import { render as rtlRender, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import GoalsThresholdsScreen from "../../../app/(home)/(health)/goals-thresholds";
import { createTestQueryClient, queryClientWrapper } from "../../../test-utils/reactQuery";
import { clampGoal, limitRows } from "../../../services/dailyLimits";

// HL-156: Settings › Health targets and limits. The daily limits are read-only (strict, from the guidelines); only the
// movement goal can be changed.

jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "user-1" }) }));
jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));

const TARGETS = {
  bmi: 24.1,
  bmi_category: "Overweight",
  calories: { value: 1880, source: "Mifflin-St Jeor equation", why: "What your body uses in a day." },
  sat_fat_g: { value: 13, source: "American Heart Association", why: "About 6% of your calories." },
  cholesterol_mg: { value: 200, source: "Philippine dyslipidemia guidelines (low-cholesterol diet); NCEP", why: "A low-cholesterol diet." },
  sodium_mg: {
    value: 1500,
    source: "American Heart Association; Philippine Heart Association and Philippine Society of Hypertension",
    why: "The limit advised for healthy blood pressure.",
  },
};

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  const Wrapper = queryClientWrapper(createTestQueryClient());
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper>
        <GoalsThresholdsScreen />
      </Wrapper>
    </SafeAreaProvider>,
  );
}

describe("Health targets and limits (HL-156)", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  it("shows the daily limits read-only, with their sources", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ targets: TARGETS, thresholds: { active_minutes_goal: 30 } }),
    });
    await renderScreen();
    expect(await screen.findByText("1,500 mg a day")).toBeOnTheScreen();
    expect(screen.getByText(/Philippine Heart Association and Philippine Society of Hypertension/)).toBeOnTheScreen();
    expect(screen.getByText("200 mg a day")).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText("1500")).toBeNull(); // no sodium field any more
    expect(screen.getByText("30 min")).toBeOnTheScreen();
  });

  it("saves only the movement goal", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ targets: TARGETS, thresholds: { active_minutes_goal: 30 } }),
    });
    const user = userEvent.setup();
    await renderScreen();
    await user.press(await screen.findByRole("button", { name: "Raise the goal by 5 minutes" }));
    expect(screen.getByText("35 min")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Save movement goal" }));
    const put = (apiFetch as jest.Mock).mock.calls.find((call) => call[1]?.method === "PUT");
    expect(put[0]).toBe("/api/analytics/user-1/thresholds");
    expect(JSON.parse(put[1].body)).toEqual({ active_minutes_goal: 35 });
  });
});

describe("daily limit helpers", () => {
  it("lists sodium and cholesterol first, in plain units", () => {
    expect(limitRows(TARGETS).map((r) => `${r.label}: ${r.value}`)).toEqual([
      "Sodium: 1,500 mg",
      "Cholesterol: 200 mg",
      "Saturated fat: 13 g",
      "Calories: 1,880 kcal",
    ]);
  });

  it("keeps the movement goal between 10 and 120 minutes, in 5-minute steps", () => {
    expect(clampGoal(5)).toBe(10);
    expect(clampGoal(33)).toBe(35);
    expect(clampGoal(200)).toBe(120);
  });
});
