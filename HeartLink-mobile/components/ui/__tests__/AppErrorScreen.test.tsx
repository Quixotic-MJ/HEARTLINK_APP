import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { AppErrorScreen } from "../AppErrorScreen";
import { logAppError } from "../../../services/errorLog";

jest.mock("../../../services/errorLog", () => ({ logAppError: jest.fn() }));

describe("AppErrorScreen (HL-024)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows a friendly message and logs the error", async () => {
    const error = new Error("boom");
    await render(<AppErrorScreen error={error} retry={jest.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText("Something went wrong")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /try again/i })).toBeOnTheScreen();
    expect(logAppError).toHaveBeenCalledWith(error, "error_boundary");
  });

  it("reloads the screen when Try again is pressed", async () => {
    const user = userEvent.setup();
    const retry = jest.fn().mockResolvedValue(undefined);
    await render(<AppErrorScreen error={new Error("boom")} retry={retry} />);

    await user.press(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
  });
});
