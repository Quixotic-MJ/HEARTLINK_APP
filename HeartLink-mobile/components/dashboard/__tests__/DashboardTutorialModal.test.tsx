import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { DashboardTutorialModal, TourRect } from "../DashboardTutorialModal";

const box = (y: number, height = 120): TourRect => ({ x: 20, y, width: 350, height });

describe("Dashboard tour", () => {
  it("skips a section that isn't on screen and finishes on the last step", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onStepChange = jest.fn();
    // No recommendations yet: "summary" has no height, so the tour has three steps.
    await render(
      <DashboardTutorialModal
        visible
        onClose={onClose}
        onStepChange={onStepChange}
        targetLayouts={{ score: box(100, 300), missions: box(150), vitals: box(160), summary: box(0, 0) }}
      />,
    );

    expect(screen.getByText("Your heart health score")).toBeOnTheScreen();
    expect(screen.getByText("1 of 3")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Today's missions")).toBeOnTheScreen();
    expect(onStepChange).toHaveBeenLastCalledWith("missions");

    await user.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Today so far")).toBeOnTheScreen();
    expect(screen.queryByText("Recommended for you")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Start using HeartLink" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("goes back a step and can be skipped at any time", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(
      <DashboardTutorialModal
        visible
        onClose={onClose}
        targetLayouts={{ score: box(100, 300), missions: box(150), vitals: box(160), summary: box(400) }}
      />,
    );

    await user.press(screen.getByRole("button", { name: "Next" }));
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Your heart health score")).toBeOnTheScreen();
    expect(screen.getByText("1 of 4")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Skip the tour" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows nothing until the sections are measured", async () => {
    await render(<DashboardTutorialModal visible onClose={jest.fn()} />);
    expect(screen.queryByText("Your heart health score")).not.toBeOnTheScreen();
  });
});
