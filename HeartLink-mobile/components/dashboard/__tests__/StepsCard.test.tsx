import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { StepsPage, StepsInvite, briskLine, goalShare, sampleStepWeek, weekdayLetter } from "../StepsCard";
import type { StepWeek } from "../../../hooks/useSteps";

// HL-163: the Steps page of the dashboard's score card, and the invite shown while step tracking is off.

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

describe("Steps page of the score card", () => {
  it("shows today's steps against the goal, what's left, the brisk minutes and the week", async () => {
    await render(<StepsPage week={WEEK} loading={false} onOpen={jest.fn()} />);
    expect(screen.getByText("4,210")).toBeOnTheScreen();
    expect(screen.getByText("of 7,000 steps")).toBeOnTheScreen();
    expect(screen.getByText("2,790 steps to go")).toBeOnTheScreen();
    expect(screen.getByText("12 brisk min counted toward your Habit score")).toBeOnTheScreen();
    expect(screen.queryByText("Goal reached")).not.toBeOnTheScreen();
  });

  it("says when today's goal is reached, and opens the Steps screen", async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();
    const days = [...WEEK.days.slice(0, 6), { day: "2026-11-20", steps: 9100, brisk_minutes: 30, synced: true }];
    await render(<StepsPage week={{ ...WEEK, days }} loading={false} onOpen={onOpen} />);
    expect(screen.getByText("Goal reached")).toBeOnTheScreen();
    expect(screen.queryByText(/to go/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "See your steps this week" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("marks sample numbers in Expo Go, which can't read steps", async () => {
    const week = sampleStepWeek(new Date("2026-11-23T04:00:00Z"));
    expect(week.days.map((d) => d.day)).toEqual([
      "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23",
    ]);
    await render(<StepsPage week={week} loading={false} onOpen={jest.fn()} sample />);
    expect(screen.getByText("Sample")).toBeOnTheScreen();
    expect(screen.getByText("Real steps need the installed Android app")).toBeOnTheScreen();
    expect(screen.getByText("4,870")).toBeOnTheScreen();
    expect(screen.queryByText(/From Health Connect/)).not.toBeOnTheScreen();
  });

  it("fills the ring toward the goal, never past it", () => {
    expect(goalShare(3500, 7000)).toBe(0.5);
    expect(goalShare(9100, 7000)).toBe(1);
    expect(goalShare(0, 0)).toBe(0);
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
