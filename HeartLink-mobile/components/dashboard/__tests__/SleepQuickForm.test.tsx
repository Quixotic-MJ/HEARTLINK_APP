import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { SleepQuickForm } from "../MissionDropdowns";

const mockMutate = jest.fn();
const mockShowToast = jest.fn();
jest.mock("../../../hooks/useLogSleep", () => ({
  useLogSleep: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock("../../../contexts/ToastContext", () => ({ useToast: () => ({ showToast: mockShowToast }) }));
jest.mock("@react-native-community/datetimepicker", () => () => null);
let mockSaved: { bedtime: string; wake_time: string }[] = [];
jest.mock("../../../hooks/useSleepLogs", () => ({ useSleepLogs: () => ({ data: mockSaved }) }));

describe("Sleep log: how rested do you feel (2026-11-19)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaved = [];
  });

  it("picks nothing for the patient, and doesn't save until they choose", async () => {
    const user = userEvent.setup();
    await render(<SleepQuickForm userId="u1" token="t" onSaved={jest.fn()} />);
    expect(screen.getByLabelText("Sleep quality Good")).not.toBeSelected();
    await user.press(screen.getByRole("button", { name: "Save Sleep Log" }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ title: "How rested do you feel?" }));
  });

  it("saves the answer the patient tapped", async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    await render(<SleepQuickForm userId="u1" token="t" onSaved={onSaved} />);
    await user.press(screen.getByLabelText("Sleep quality Fair"));
    await user.press(screen.getByRole("button", { name: "Save Sleep Log" }));
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ quality: "Fair" }), expect.anything());
    expect(onSaved).toHaveBeenCalled();
  });

  it("doesn't save a night that's already logged, and says so (2026-11-19)", async () => {
    // The form starts at "the last 7.5 hours"; this saved night covers the same time
    const now = Date.now();
    mockSaved = [{ bedtime: new Date(now - 8 * 3600e3).toISOString(), wake_time: new Date(now - 3600e3).toISOString() }];
    const user = userEvent.setup();
    await render(<SleepQuickForm userId="u1" token="t" onSaved={jest.fn()} />);
    await user.press(screen.getByLabelText("Sleep quality Good"));
    await user.press(screen.getByRole("button", { name: "Save Sleep Log" }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Already logged" }));
  });
});
