import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StepsCard, StepsInvite, briskLine, weekdayLetter } from "../StepsCard";
import type { StepWeek } from "../../../hooks/useSteps";

// HL-163: the dashboard's Steps card and the invite shown while step tracking is off.

const WEEK: StepWeek = {
  goal: 7000,
  last_synced_at: "2026-11-20T08:00:00Z",
  days: [
    { day: "2026-11-14", steps: 3000, brisk_minutes: 0, synced: true },
    { day: "2026-11-15", steps: 8000, brisk_minutes: 20, synced: true },
    { day: "2026-11-16", steps: 0, brisk_minutes: 0, synced: false },
    { day: "2026-11-17", steps: 5000, brisk_minutes: 5, synced: true },
    { day: "2026-11-18", steps: 7200, brisk_minutes: 15, synced: true },
    { day: "2026-11-19", steps: 6100, brisk_minutes: 0, synced: true },
    { day: "2026-11-20", steps: 4210, brisk_minutes: 12, synced: true },
  ],
};

describe("Steps card", () => {
  it("shows today's steps against the goal, the brisk minutes and the week", async () => {
    await render(<StepsCard week={WEEK} loading={false} onPress={jest.fn()} />);
    expect(screen.getByText("4,210")).toBeOnTheScreen();
    expect(screen.getByText("of 7,000 steps")).toBeOnTheScreen();
    expect(screen.getByText("12 brisk min counted toward your Habit score")).toBeOnTheScreen();
    expect(screen.queryByText("Goal reached")).not.toBeOnTheScreen();
  });

  it("says when today's goal is reached, and opens the Steps screen when tapped", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    const days = [...WEEK.days.slice(0, 6), { day: "2026-11-20", steps: 9100, brisk_minutes: 30, synced: true }];
    await render(<StepsCard week={{ ...WEEK, days }} loading={false} onPress={onPress} />);
    expect(screen.getByText("Goal reached")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Steps today: 9,100 of 7,000/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("explains how to earn minutes when there's no brisk walking yet", () => {
    expect(briskLine(0)).toBe("Walk briskly (about 100 steps a minute) to add movement minutes");
    expect(weekdayLetter("2026-11-20")).toBe("F");
  });
});

describe("Steps invite", () => {
  it("offers to turn tracking on and can be hidden", async () => {
    const user = userEvent.setup();
    const onTurnOn = jest.fn();
    const onHide = jest.fn();
    await render(<StepsInvite onTurnOn={onTurnOn} onHide={onHide} />);
    await user.press(screen.getByRole("button", { name: "Turn on step tracking" }));
    await user.press(screen.getByRole("button", { name: "Hide this" }));
    expect(onTurnOn).toHaveBeenCalledTimes(1);
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
