import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppearanceScreen from "../../../app/(home)/(settings)/appearance";

// HL-137: the Appearance setting is applied straight away and remembered; System is the default.
const mockSetColorScheme = jest.fn();
jest.mock("nativewind", () => ({
  useColorScheme: () => ({ colorScheme: "light", setColorScheme: mockSetColorScheme }),
}));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));

describe("Appearance (HL-137)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("starts on System default when nothing is saved", async () => {
    await render(<AppearanceScreen />);
    expect(await screen.findByRole("radio", { name: /System default/, checked: true })).toBeOnTheScreen();
  });

  it.each([
    ["Dark", "dark"],
    ["Light", "light"],
    ["System default", "system"],
  ])("applies and saves %s", async (label, value) => {
    const user = userEvent.setup();
    await render(<AppearanceScreen />);
    await user.press(screen.getByRole("radio", { name: new RegExp(`^${label},`) }));
    expect(mockSetColorScheme).toHaveBeenCalledWith(value);
    await waitFor(async () => expect(await AsyncStorage.getItem("theme_preference")).toBe(value));
  });

  it("shows the saved choice when opened again", async () => {
    await AsyncStorage.setItem("theme_preference", "dark");
    await render(<AppearanceScreen />);
    expect(await screen.findByRole("radio", { name: /^Dark,/, checked: true })).toBeOnTheScreen();
  });
});
