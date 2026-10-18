import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { TourSpot, TourTarget, useDashboardTour } from "../DashboardTour";

const TARGETS: TourTarget[] = ["score", "missions", "vitals", "summary"];

// A stand-in dashboard: four sections, and the tour starts straight away.
function Dashboard({ hasRecommendations = true, onFinish = jest.fn() }: { hasRecommendations?: boolean; onFinish?: () => void }) {
  const { tour, start } = useDashboardTour({
    shown: { score: true, missions: true, vitals: true, summary: hasRecommendations },
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
    await render(<Dashboard hasRecommendations={false} onFinish={onFinish} />);

    expect(screen.getByText("Your heart health score")).toBeOnTheScreen();
    expect(screen.getByText("1 of 3")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Today's missions")).toBeOnTheScreen();
    // Only one tip at a time: the score tip is gone.
    expect(screen.queryByText("Your heart health score")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Today so far")).toBeOnTheScreen();
    expect(screen.queryByText("Recommended for you")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Finish tour" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Today so far")).not.toBeOnTheScreen();
    // The sections themselves stay.
    expect(screen.getByText("vitals section")).toBeOnTheScreen();
  });

  it("goes back a step and can be skipped at any time", async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    await render(<Dashboard onFinish={onFinish} />);

    await user.press(screen.getByRole("button", { name: "Next" }));
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Your heart health score")).toBeOnTheScreen();
    expect(screen.getByText("1 of 4")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Skip the tour" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("header")).not.toBeOnTheScreen();
  });
});
