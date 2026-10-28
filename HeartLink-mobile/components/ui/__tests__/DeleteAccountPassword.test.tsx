import React from "react";
import { render as rtlRender, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AccountSecurityScreen from "../../../app/(home)/(settings)/account-security";

// The delete-account dialog's password box can be shown, so a person can check what they typed.

jest.mock("../../../contexts/UserContext", () => ({
  useUser: () => ({ userId: "user-1", token: "token", logout: jest.fn(), setUserId: jest.fn() }),
}));
jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));
// The screen only needs isSessionTokens; the real module reads the server address, which tests don't set
jest.mock("../../../services/SessionService", () => ({ isSessionTokens: () => false }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

it("shows and hides the password in the delete dialog", async () => {
  await rtlRender(
    <SafeAreaProvider initialMetrics={metrics}>
      <AccountSecurityScreen />
    </SafeAreaProvider>,
  );
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Delete my account" }));

  const box = await screen.findByLabelText("Current password");
  await user.type(box, "Correct-horse-battery-9!");
  expect(box).toHaveProp("secureTextEntry", true);

  await user.press(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("Current password")).toHaveProp("secureTextEntry", false);

  await user.press(screen.getByRole("button", { name: "Hide password" }));
  expect(screen.getByLabelText("Current password")).toHaveProp("secureTextEntry", true);
});
