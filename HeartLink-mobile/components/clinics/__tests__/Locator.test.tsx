import React from "react";
import { render as rtlRender, screen, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import LocatorScreen from "../../../app/locator";
import { createTestQueryClient, queryClientWrapper } from "../../../test-utils/reactQuery";

// HL-078 / HL-088: the emergency locator, opened from the dashboard and the emergency warning.

jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 10.31, longitude: 123.893 } })),
}));
jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual("react-native");
  return { WebView: () => <View testID="clinic-map" /> };
});

const CLINICS = [
  { id: "hc", name: "Pardo Health Center", kind: "health_center", has_er: null, latitude: 10.279, longitude: 123.856, phone: null },
  { id: "vsmmc", name: "Vicente Sotto Memorial Medical Center", kind: "er_hospital", has_er: true, latitude: 10.3078, longitude: 123.8917, phone: "+63 32 253 9891" },
  { id: "visayasmed", name: "VisayasMed Hospital", kind: "er_hospital", has_er: true, latitude: 10.3065, longitude: 123.8951, phone: null },
];

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderLocator() {
  const Wrapper = queryClientWrapper(createTestQueryClient());
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper>
        <LocatorScreen />
      </Wrapper>
    </SafeAreaProvider>,
  );
}

describe("Emergency locator", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  it("lists emergency rooms first, with the map above", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => CLINICS });
    await renderLocator();

    const names = await screen.findAllByText(/Hospital|Medical Center|Health Center/);
    expect(names.map((n) => n.props.children)).toEqual([
      "Vicente Sotto Memorial Medical Center",
      "VisayasMed Hospital",
      "Pardo Health Center",
    ]);
    expect(screen.getByTestId("clinic-map")).toBeOnTheScreen();
    // two emergency rooms in the list, plus the map's key ("Emergency room", "Clinic or hospital", "You")
    expect(screen.getAllByText("Emergency room")).toHaveLength(3);
    expect(screen.getByText("Clinic or hospital")).toBeOnTheScreen();
    expect(screen.getByText("Health centre")).toBeOnTheScreen();
  });

  it("offers Call only for a checked number, and Directions for every place", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => CLINICS });
    await renderLocator();

    await screen.findByText("VisayasMed Hospital");
    expect(screen.getAllByRole("button", { name: /^Directions to / })).toHaveLength(3);
    const calls = screen.getAllByRole("button", { name: /^Call / });
    expect(calls).toHaveLength(1);
    expect(within(calls[0]).getByText("Call")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Call Vicente Sotto Memorial Medical Center" })).toBeOnTheScreen();
    expect(screen.queryByText(/Unassigned|24\/7|Open now/)).toBeNull();
  });

  it("says when clinics couldn't load, and points to 911", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({}) });
    await renderLocator();
    expect(await screen.findByText("Couldn't load clinics")).toBeOnTheScreen();
    expect(screen.getByText(/In an emergency, call 911/)).toBeOnTheScreen();
  });
});
