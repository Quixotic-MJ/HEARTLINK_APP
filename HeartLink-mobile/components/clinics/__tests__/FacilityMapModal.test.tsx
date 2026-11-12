import React from "react";
import { render as rtlRender, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import { FacilityMapModal } from "../../dashboard/FacilityMapModal";
import { createTestQueryClient, queryClientWrapper } from "../../../test-utils/reactQuery";

// The dashboard's "Nearby clinics" pop-up: the nearest emergency room first, with the same card as the full locator.

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

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 48 } };

async function renderModal(onOpenFull = jest.fn()) {
  const Wrapper = queryClientWrapper(createTestQueryClient());
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper>
        <FacilityMapModal visible onClose={jest.fn()} onOpenFull={onOpenFull} />
      </Wrapper>
    </SafeAreaProvider>,
  );
}

describe("Nearby clinics pop-up", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  it("shows the nearest emergency room with Directions and Call, and the next ones below", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => CLINICS });
    await renderModal();
    expect(await screen.findByRole("button", { name: "Directions to Vicente Sotto Memorial Medical Center" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Call Vicente Sotto Memorial Medical Center" })).toBeOnTheScreen();
    expect(screen.getByText("Nearby emergency rooms")).toBeOnTheScreen();
    expect(screen.getByText("More nearby")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^VisayasMed Hospital\./ })).toBeOnTheScreen();
  });

  it("shows another place in the card when it's tapped", async () => {
    const user = userEvent.setup();
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => CLINICS });
    await renderModal();
    await user.press(await screen.findByRole("button", { name: /^Pardo Health Center\./ }));
    expect(screen.getByRole("button", { name: "Directions to Pardo Health Center" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Call / })).toBeNull(); // no checked number
  });
});
