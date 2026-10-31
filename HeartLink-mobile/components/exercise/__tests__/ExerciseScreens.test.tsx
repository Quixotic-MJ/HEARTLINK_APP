import React from "react";
import { render as rtlRender, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CardioExerciseActive } from "../CardioExerciseActive";
import { StretchingExerciseActive } from "../StretchingExerciseActive";
import { StopSheet } from "../SessionSheets";
import { BigClock } from "../ExerciseBits";
import { toRoutine } from "../../../services/exerciseSession";

const walk = toRoutine({
  id: "w1",
  name: "Morning walk",
  type: "Light Cardio",
  duration_minutes: 12,
  steps: ["Warm up with slow steps", "Walk at an easy pace", "Slow down to cool down"],
});

// The screens read the phone's safe areas, as inside the real app.
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const render = (ui: React.ReactElement) => rtlRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

const handlers = () => ({
  onTogglePause: jest.fn(),
  onFinish: jest.fn(),
  onClose: jest.fn(),
  onUnwell: jest.fn(),
  voice: { say: jest.fn(), sayIfQuiet: jest.fn(), stop: jest.fn(), muted: false, toggleMute: jest.fn(), cue: jest.fn() },
});

describe("Exercise screens", () => {
  it("shrinks the big clock to fit its ring when it shows more digits", async () => {
    await render(<BigClock seconds={900} maxWidth={196} />);
    // "15:00" needs more room than "0:45", so it's drawn smaller than the usual 72.
    expect(screen.getByText("15")).toHaveStyle({ fontSize: 68 });
    await render(<BigClock seconds={45} maxWidth={196} />);
    expect(screen.getByText("45")).toHaveStyle({ fontSize: 72 });
  });

  it("shows the timer and the current step, and keeps 'I feel unwell' on screen", async () => {
    const user = userEvent.setup();
    const h = handlers();
    await render(<CardioExerciseActive routine={walk} elapsed={252} elapsedMs={252000} paused={false} {...h} />);

    // The big timer counts down the part you're in; the whole session is a small line.
    expect(screen.getByLabelText("3:48 left in main part")).toBeOnTheScreen();
    expect(screen.getByText("4:12 of 12:00 total")).toBeOnTheScreen();
    // 12 minutes shared by 3 steps: 4:12 is 12 s into the second, so 3:48 of it is left.
    expect(screen.getAllByText("Main part").length).toBeGreaterThan(0);
    expect(screen.getByText("Walk at an easy pace")).toBeOnTheScreen();
    expect(screen.getByText("Next: Slow down to cool down")).toBeOnTheScreen();
    // The current step is read out loud.
    // "Warm up with slow steps" is recognised as the warm-up, so this is announced as the main part.
    expect(h.voice.say).toHaveBeenCalledWith("Now the main part. Walk at an easy pace");

    await user.press(screen.getByRole("button", { name: "I feel unwell" }));
    expect(h.onUnwell).toHaveBeenCalledTimes(1);
    expect(h.onFinish).not.toHaveBeenCalled();
    // Finish only shows while paused, so it can't be tapped by accident.
    expect(screen.queryByRole("button", { name: "Finish and save" })).not.toBeOnTheScreen();
  });

  it("offers Finish once paused", async () => {
    const user = userEvent.setup();
    const h = handlers();
    await render(<CardioExerciseActive routine={walk} elapsed={252} elapsedMs={252000} paused {...h} />);
    await user.press(screen.getByRole("button", { name: "Finish and save" }));
    expect(h.onFinish).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole("button", { name: "Resume" }));
    expect(h.onTogglePause).toHaveBeenCalledTimes(1);
  });

  it("finishes by itself once the planned time is up", async () => {
    const h = handlers();
    await render(<CardioExerciseActive routine={walk} elapsed={720} elapsedMs={720000} paused={false} {...h} />);
    expect(h.onFinish).toHaveBeenCalledTimes(1);
  });

  it("moves to the next move without counting it as time spent", async () => {
    const user = userEvent.setup();
    const h = handlers();
    const stretches = toRoutine({
      id: "s1",
      name: "Seated stretches",
      type: "Stationary",
      duration_minutes: 2,
      steps: [
        { instruction: "Shoulder rolls", duration_seconds: 30 },
        { instruction: "Neck turns", duration_seconds: 30 },
      ],
    });
    await render(<StretchingExerciseActive routine={stretches} elapsed={5} elapsedMs={5000} paused={false} {...h} />);
    // An old 2-minute exercise whose moves add up to 1 minute repeats them: two rounds.
    expect(screen.getByText("Main part, round 1 of 2")).toBeOnTheScreen();
    expect(screen.getByText("Shoulder rolls")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Next move" }));
    expect(screen.getByText("Neck turns")).toBeOnTheScreen();
    expect(h.voice.say).toHaveBeenLastCalledWith("Neck turns");
    expect(screen.getByRole("button", { name: "Next move" })).toBeOnTheScreen();
  });

  it("asks why you're stopping and keeps going when asked", async () => {
    const user = userEvent.setup();
    const onUnwell = jest.fn();
    const onTired = jest.fn();
    const onKeepGoing = jest.fn();
    await render(<StopSheet visible seconds={252} onUnwell={onUnwell} onTired={onTired} onKeepGoing={onKeepGoing} />);

    expect(screen.getByText("The timer is paused. You did 4 min 12 s.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Keep going" }));
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
    await user.press(screen.getByRole("button", { name: /I don't feel well/ }));
    expect(onUnwell).toHaveBeenCalledTimes(1);
  });
});
