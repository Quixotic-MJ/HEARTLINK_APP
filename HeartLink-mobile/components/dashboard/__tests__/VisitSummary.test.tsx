import React from "react";
import { render as rtlRender, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import WrapUpScreen from "../../../app/(home)/(tabs)/consultation-summary";

// HL-079: when the summary can't load and nothing is saved on the phone, say so instead of loading forever.

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({ shareAsync: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({ documentDirectory: "file://", writeAsStringAsync: jest.fn(), EncodingType: { Base64: "base64" } }));
jest.mock("../../../lib/secureTokenStore", () => ({ getToken: jest.fn(async () => "token") }));
jest.mock("../../../contexts/UserContext", () => ({ useUser: () => ({ userId: "user-1", user: {}, token: "token" }) }));
jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const render = (ui: React.ReactElement) => rtlRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

describe("Visit summary", () => {
  beforeEach(() => (apiFetch as jest.Mock).mockReset());

  it("says it couldn't load and lets you try again", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const user = userEvent.setup();
    await render(<WrapUpScreen />);

    expect(await screen.findByText("Your summary couldn't load")).toBeOnTheScreen();
    const calls = (apiFetch as jest.Mock).mock.calls.length;
    await user.press(screen.getByRole("button", { name: "Try again" }));
    expect((apiFetch as jest.Mock).mock.calls.length).toBe(calls + 1);
  });

  it("also covers a dropped connection", async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new TypeError("Network request failed"));
    await render(<WrapUpScreen />);
    expect(await screen.findByText("Your summary couldn't load")).toBeOnTheScreen();
  });
});
