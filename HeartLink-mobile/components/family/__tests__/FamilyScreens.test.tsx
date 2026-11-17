import React from "react";
import { Linking } from "react-native";
import { render as rtlRender, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import FamilySharingScreen from "../../../app/(home)/(settings)/family-sharing";
import FollowScreen from "../../../app/(family)/follow";
import FollowedPersonScreen from "../../../app/(family)/[patientId]";
import { createTestQueryClient, queryClientWrapper } from "../../../test-utils/reactQuery";

// HL-087: the family sharing screens: the patient's side, entering a code, and what a follower sees.

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => ({ patientId: "pat-1" }),
}));
jest.mock("../../../contexts/UserContext", () => ({
  useUser: () => ({ userId: "user-1", user: { account_kind: "patient" }, refreshUser: jest.fn() }),
}));
jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen(ui: React.ReactElement) {
  const Wrapper = queryClientWrapper(createTestQueryClient());
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper>{ui}</Wrapper>
    </SafeAreaProvider>,
  );
}

const reply = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body });

const SHARING = {
  is_premium: true,
  invite: { code: "K7MQ2P", expires_at: new Date(Date.now() + 3600000).toISOString() },
  followers: [{ id: "fam-1", name: "Ben R.", since: new Date().toISOString() }],
  max_followers: 5,
};

describe("Family sharing (the patient)", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  it("shows the code to send and who follows you", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(reply(SHARING));
    await renderScreen(<FamilySharingScreen />);
    expect(await screen.findByText("K7M-Q2P")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Share code" })).toBeOnTheScreen();
    expect(screen.getByText("Ben R.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Remove Ben R." })).toBeOnTheScreen();
  });

  it("asks before removing someone", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(reply(SHARING));
    await renderScreen(<FamilySharingScreen />);
    await userEvent.setup().press(await screen.findByRole("button", { name: "Remove Ben R." }));
    expect(await screen.findByText("Remove Ben R.?")).toBeOnTheScreen();
    expect((apiFetch as jest.Mock).mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
  });

  it("offers Premium to a free patient", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(reply({ ...SHARING, is_premium: false, invite: null, followers: [] }));
    await renderScreen(<FamilySharingScreen />);
    expect(await screen.findByRole("button", { name: "See HeartLink Premium" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Create an invite code" })).toBeNull();
  });
});

describe("Following someone", () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockReset();
    mockReplace.mockReset();
  });

  it("checks the code has 6 characters before sending it", async () => {
    await renderScreen(<FollowScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Invite code"), "k7m");
    await user.press(screen.getByRole("button", { name: "Follow" }));
    expect(await screen.findByText(/The code has 6 letters and numbers/)).toBeOnTheScreen();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows the server's answer for a wrong code", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(reply({ detail: "That code didn't work. Check it, or ask for a new one." }, 400));
    await renderScreen(<FollowScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Invite code"), "k7mq2p");
    await user.press(screen.getByRole("button", { name: "Follow" }));
    expect(await screen.findByText("That code didn't work. Check it, or ask for a new one.")).toBeOnTheScreen();
    expect(JSON.parse((apiFetch as jest.Mock).mock.calls[0][1].body)).toEqual({ code: "K7MQ2P" });
  });

  it("opens the person after following", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(reply({ id: "pat-1", name: "Ana R." }));
    await renderScreen(<FollowScreen />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Invite code"), "K7MQ2P");
    await user.press(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({ pathname: "/(family)/[patientId]", params: { patientId: "pat-1" } }),
    );
  });
});

describe("What a follower sees", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  const day = (date: string) => ({ date, systolic: null, diastolic: null, score: null });
  const SUMMARY = {
    id: "pat-1",
    name: "Ana R.",
    paused: false,
    latest_bp: { systolic: 138, diastolic: 88, at: new Date().toISOString() },
    latest_pulse: { bpm: 82, at: new Date().toISOString() },
    score: { value: 71, at: new Date().toISOString() },
    last_check_in: new Date().toISOString(),
    days: [day("2026-10-26"), { date: "2026-10-27", systolic: 138, diastolic: 88, score: 71 }],
    open_alerts: [{ type: "Hypertensive Crisis", severity: "critical", at: new Date().toISOString() }],
  };
  // HL-161: the last 7 days
  const iso = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const WEEK = {
    days: [
      { date: iso(0), bp: { systolic: 142, diastolic: 90, category: "stage_2", readings: 2 }, pulse: 75, medicine: false, logged: true },
      { date: iso(1), bp: null, pulse: null, medicine: null, logged: false },
      { date: iso(2), bp: { systolic: 118, diastolic: 76, category: "normal", readings: 1 }, pulse: null, medicine: true, logged: true },
      ...[3, 4, 5, 6].map((n) => ({ date: iso(n), bp: null, pulse: null, medicine: null, logged: false })),
    ],
    readings: 3,
    highest: { systolic: 142, diastolic: 90, category: "stage_2", date: iso(0) },
  };

  it("shows the latest readings and an open alert with Call 911", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    (apiFetch as jest.Mock).mockResolvedValue(reply(SUMMARY));
    await renderScreen(<FollowedPersonScreen />);
    expect(await screen.findByText("138/88")).toBeOnTheScreen();
    expect(screen.getByText("Open health alert: Hypertensive Crisis")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Call 911" }));
    expect(open).toHaveBeenCalledWith("tel:911");
    expect(screen.getByText(/isn't a diagnosis/)).toBeOnTheScreen();
    expect((apiFetch as jest.Mock).mock.calls[0][0]).toBe("/api/family/following/pat-1/summary");
    open.mockRestore();
  });

  it("shows the last 7 days in plain words, with the chart only on request", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(reply({ ...SUMMARY, open_alerts: [], week: WEEK }));
    await renderScreen(<FollowedPersonScreen />);
    expect(await screen.findByText("The last 7 days")).toBeOnTheScreen();
    expect(screen.getByText(/logged something on 2 of the last 7 days/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Today: blood pressure 142 over 90, Very high; medicine not taken/)).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/nothing logged/).length).toBe(5);
    expect(screen.getByText(/Normal is under 120\/80/)).toBeOnTheScreen();
    // each number says what it means
    expect(screen.getByText(/chance of a heart attack or stroke/)).toBeOnTheScreen();
    // the 30-day chart is behind a button now
    expect(screen.queryByText(/Each bar is one day/)).toBeNull();
    await userEvent.setup().press(screen.getByRole("button", { name: "Show the 30-day blood pressure chart" }));
    expect(screen.getByText(/Each bar is one day/)).toBeOnTheScreen();
  });

  it("says when sharing is paused", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(reply({ id: "pat-1", name: "Ana R.", paused: true }));
    await renderScreen(<FollowedPersonScreen />);
    expect(await screen.findByText("Sharing is paused")).toBeOnTheScreen();
    expect(screen.queryByText("138/88")).toBeNull();
  });

  it("says so when you no longer follow them", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(reply({ detail: "You don't follow this person." }, 403));
    await renderScreen(<FollowedPersonScreen />);
    expect(await screen.findByText("You don't follow this person.")).toBeOnTheScreen();
  });
});
