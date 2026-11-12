import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { TourSpot, TourTarget, useDashboardTour } from "../DashboardTour";

const TARGETS: TourTarget[] = ["score", "missions", "note", "vitals", "summary", "care"];

// A stand-in dashboard: seven sections, and the tour starts straight away. A critical score hides the picks, as
// the real dashboard does; care tools stay.
function Dashboard({ critical = false, hasNote = true, onFinish = jest.fn() }: { critical?: boolean; hasNote?: boolean; onFinish?: () => void }) {
  const { tour, start } = useDashboardTour({
    shown: { score: true, note: hasNote, missions: true, vitals: true, summary: !critical, care: true },
    onFinish,
    onShown: jest.fn(),
  });
  useEffect(start, [start]);
  return (
    <View>
      {TARGETS.map((t) => (
        <TourSpot key={t} target={t} tour={tour}>
          <Text>{t} section</Text>
        </TourSpot>
      ))}
    </View>
  );
}

describe("Dashboard tour", () => {
  it("skips a section that isn't shown and finishes on the last step", async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    await render(<Dashboard critical hasNote={false} onFinish={onFinish} />);

    // The habits card comes first (its swipe pages hold today's habits and the Heart risk, 2026-11-12)
    expect(screen.getByText("Your heart health habits")).toBeOnTheScreen();
    expect(screen.getByText("1 of 4")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Today's check-ins")).toBeOnTheScreen();
    // Only one tip at a time: the score tip is gone.
    expect(screen.queryByText("Your heart health habits")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Blood pressure this week")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByText("Picked for you")).not.toBeOnTheScreen();
    expect(screen.getByText("Care & Support")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Finish tour" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Care & Support")).not.toBeOnTheScreen();
    // The sections themselves stay.
    expect(screen.getByText("vitals section")).toBeOnTheScreen();
  });

  it("goes back a step and can be skipped at any time", async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    await render(<Dashboard onFinish={onFinish} />);

    await user.press(screen.getByRole("button", { name: "Next" }));
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Your heart health habits")).toBeOnTheScreen();
    expect(screen.getByText("1 of 6")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Skip the tour" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("header")).not.toBeOnTheScreen();
  });
});
