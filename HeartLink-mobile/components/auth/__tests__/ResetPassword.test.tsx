import React from "react";
import { fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiFetch } from "../../../lib/api";
import ForgotPasswordScreen from "../../../app/(auth)/forgot-password";
import ResetPasswordScreen from "../../../app/(auth)/reset-password";

// Forgot password on the phone: step 1 emails a 6-digit code, step 2 takes the code and the new password.

jest.mock("../../../lib/api", () => ({ apiFetch: jest.fn() }));
const mockShowToast = jest.fn();
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: mockShowToast }) }));
let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), dismissTo: mockDismissTo }),
  useLocalSearchParams: () => mockParams,
}));

const SCREEN_TEST_MS = 20000;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const NEW_PASSWORD = "A-brand-new-password-2026!";

function answer(status: number, body: unknown) {
  (apiFetch as jest.Mock).mockResolvedValue({ ok: status < 300, status, json: async () => body });
}

async function renderScreen(Screen: React.ComponentType) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Screen />
    </SafeAreaProvider>
  );
}

const sentBody = (call = 0) => JSON.parse((apiFetch as jest.Mock).mock.calls[call][1].body);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe("Forgot password, step 1", () => {
  it(
    "asks for a code for the number in +63 form and opens the code screen",
    async () => {
      answer(200, { success: true });
      const user = userEvent.setup();
      await renderScreen(ForgotPasswordScreen);

      await user.type(screen.getByPlaceholderText("name@example.com or 0912 345 6789"), "09201234567");
      await user.press(screen.getByRole("button", { name: "Send code" }));

      await waitFor(() => expect(mockPush).toHaveBeenCalled());
      expect((apiFetch as jest.Mock).mock.calls[0][0]).toBe("/api/auth/password-reset/request");
      expect(sentBody()).toEqual({ identifier: "+639201234567" });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/(auth)/reset-password",
        params: { identifier: "+639201234567" },
      });
    },
    SCREEN_TEST_MS
  );

  it(
    "says when email can't be sent and stays on the screen",
    async () => {
      answer(503, { detail: "We couldn't send the email just now. Please try again in a minute." });
      const user = userEvent.setup();
      await renderScreen(ForgotPasswordScreen);

      await user.type(screen.getByPlaceholderText("name@example.com or 0912 345 6789"), "patient@example.com");
      await user.press(screen.getByRole("button", { name: "Send code" }));

      expect(await screen.findByText("We couldn't send the email just now. Please try again in a minute.")).toBeOnTheScreen();
      expect(mockPush).not.toHaveBeenCalled();
    },
    SCREEN_TEST_MS
  );
});

describe("Forgot password, step 2", () => {
  async function fillIn(user: ReturnType<typeof userEvent.setup>, confirm = NEW_PASSWORD) {
    // A whole code pasted or filled in from the email
    await fireEvent.changeText(screen.getByLabelText("Code digit 1 of 6"), "123456");
    await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Confirm new password"), confirm);
  }

  it(
    "keeps Set new password off until the code and a strong password are in",
    async () => {
      mockParams = { identifier: "patient@example.com" };
      const user = userEvent.setup();
      await renderScreen(ResetPasswordScreen);

      expect(screen.getByRole("button", { name: "Set new password" })).toBeDisabled();
      // A whole code pasted or filled in from the email
    await fireEvent.changeText(screen.getByLabelText("Code digit 1 of 6"), "123456");
      await user.type(screen.getByLabelText("New password"), "short");
      await user.type(screen.getByLabelText("Confirm new password"), "short");
      expect(screen.getByRole("button", { name: "Set new password" })).toBeDisabled();
    },
    SCREEN_TEST_MS
  );

  it(
    "sends the code and new password, then goes back to log in",
    async () => {
      mockParams = { identifier: "patient@example.com" };
      answer(200, { success: true });
      const user = userEvent.setup();
      await renderScreen(ResetPasswordScreen);

      await fillIn(user);
      await user.press(screen.getByRole("button", { name: "Set new password" }));

      await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith("/(auth)/login"));
      expect((apiFetch as jest.Mock).mock.calls[0][0]).toBe("/api/auth/password-reset/confirm");
      expect(sentBody()).toEqual({ identifier: "patient@example.com", code: "123456", new_password: NEW_PASSWORD });
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Password changed", type: "success" }));
    },
    SCREEN_TEST_MS
  );

  it(
    "doesn't send when the two passwords differ",
    async () => {
      mockParams = { identifier: "patient@example.com" };
      const user = userEvent.setup();
      await renderScreen(ResetPasswordScreen);

      await fillIn(user, NEW_PASSWORD + "x");
      await user.press(screen.getByRole("button", { name: "Set new password" }));

      expect(await screen.findByText("The two passwords don't match.")).toBeOnTheScreen();
      expect(apiFetch).not.toHaveBeenCalled();
    },
    SCREEN_TEST_MS
  );

  it(
    "clears \"don't match\" as soon as the second password matches",
    async () => {
      mockParams = { identifier: "patient@example.com" };
      const user = userEvent.setup();
      await renderScreen(ResetPasswordScreen);

      await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
      // Leaving the second box half typed shows the message
      await user.type(screen.getByLabelText("Confirm new password"), "A-brand");
      await fireEvent(screen.getByLabelText("Confirm new password"), "blur");
      expect(await screen.findByText("The two passwords don't match.")).toBeOnTheScreen();

      await user.type(screen.getByLabelText("Confirm new password"), "-new-password-2026!");
      await waitFor(() => expect(screen.queryByText("The two passwords don't match.")).not.toBeOnTheScreen());
    },
    SCREEN_TEST_MS
  );

  it(
    "shows the server's message for a wrong code",
    async () => {
      mockParams = { identifier: "patient@example.com" };
      answer(400, { detail: "That code isn't right. You have 4 tries left." });
      const user = userEvent.setup();
      await renderScreen(ResetPasswordScreen);

      await fillIn(user);
      await user.press(screen.getByRole("button", { name: "Set new password" }));

      expect(await screen.findByText("That code isn't right. You have 4 tries left.")).toBeOnTheScreen();
      expect(mockDismissTo).not.toHaveBeenCalled();
    },
    SCREEN_TEST_MS
  );
});
