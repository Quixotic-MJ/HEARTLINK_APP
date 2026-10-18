import React from "react";
import { render as rtlRender, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BeforeYouStart } from "../BeforeYouStart";
import { checklistFor } from "../../../services/exerciseSession";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const render = (ui: React.ReactElement) => rtlRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

describe("Before you start", () => {
  it("reads the list out and only lets you start once everything is ticked", async () => {
    const user = userEvent.setup();
    const onReady = jest.fn();
    const say = jest.fn();
    const routine = { title: "Morning walk", requirements: [], position: null, skipIf: [], stopIf: [] };
    await render(<BeforeYouStart routine={routine} onReady={onReady} onBack={jest.fn()} say={say} />);

    expect(say).toHaveBeenCalledWith(expect.stringContaining("water within reach"));
    expect(screen.getByRole("button", { name: "Tick 4 more to start" })).toBeDisabled();

    for (const item of checklistFor(routine)) {
      await user.press(screen.getByRole("checkbox", { name: new RegExp(item.label) }));
    }
    await user.press(screen.getByRole("button", { name: "I'm ready" }));
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});
