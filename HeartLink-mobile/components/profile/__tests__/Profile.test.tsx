import React from "react";
import { render as rtlRender, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import ProfileScreen from "../../../app/(home)/(profile)/profile";
import { latestVitals } from "../../../hooks/useProfileDetails";
import { createTestQueryClient, queryClientWrapper } from "../../../test-utils/reactQuery";

// The Profile screen: loads through React Query (retried, refreshed on visits), shows the latest blood pressure even
// when the newest check-in has none, and says so when it can't load instead of staying blank.

jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../../contexts/UserContext", () => ({
  useUser: () => ({ userId: "user-1", user: null, refreshUser: jest.fn() }),
}));
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("../../../components/Header", () => ({ Header: () => null }));
jest.mock("../../../hooks/useRefetchOnFocus", () => ({ useRefetchOnFocus: () => {} }));
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const PROFILE = { first_name: "Maria", last_name: "Santos", email: "maria@example.com", phone: "+639171234567", date_of_birth: "1985-06-15", sex: "female", height_cm: 160, weight_kg: 64 };
const LOGS = [
  { logged_at: "2026-11-13T08:00:00Z", systolic_bp: null, diastolic_bp: null, heart_rate_bpm: null }, // a check-in without BP
  { logged_at: "2026-11-12T08:00:00Z", systolic_bp: 128, diastolic_bp: 82, heart_rate_bpm: 70 },
];

function respond(profileOk = true) {
  (apiFetch as jest.Mock).mockImplementation(async (url: string) =>
    url.includes("/profile")
      ? { ok: profileOk, status: profileOk ? 200 : 503, json: async () => (profileOk ? { profile: PROFILE } : {}) }
      : { ok: true, status: 200, json: async () => ({ data: LOGS }) },
  );
}

async function renderProfile() {
  const Wrapper = queryClientWrapper(createTestQueryClient());
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper>
        <ProfileScreen isTab />
      </Wrapper>
    </SafeAreaProvider>,
  );
}

describe("Profile", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  it("shows the details and the latest blood pressure, even when the newest check-in has none", async () => {
    respond();
    await renderProfile();
    expect(await screen.findByText("Maria Santos")).toBeOnTheScreen();
    expect(screen.getByText("June 15, 1985")).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Blood pressure: 128\/82 mmHg/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Resting pulse: 70 bpm/)).toBeOnTheScreen();
    expect(screen.getByLabelText("BMI: 25.0")).toBeOnTheScreen();
    expect(screen.queryByText("Long-term analytics")).toBeNull(); // removed (it's on Trends)
    expect(screen.getByRole("button", { name: /^Visit summary/ })).toBeOnTheScreen();
  }, 20000);

  it("says when the profile can't load, with Try again, instead of staying blank", async () => {
    respond(false);
    await renderProfile();
    expect(await screen.findByText("Your profile couldn't load")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Try again" })).toBeOnTheScreen();
  }, 20000);
});

describe("latestVitals", () => {
  it("takes the newest log that has each reading", () => {
    expect(latestVitals(LOGS)).toEqual({ bp: { systolic: 128, diastolic: 82, loggedAt: "2026-11-12T08:00:00Z" }, restingHr: 70 });
    expect(latestVitals([])).toEqual({ bp: null, restingHr: null });
  });
});
