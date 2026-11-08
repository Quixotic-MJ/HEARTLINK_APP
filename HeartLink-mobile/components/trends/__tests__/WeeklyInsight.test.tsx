import React from "react";
import { render, screen } from "@testing-library/react-native";
import { WeeklyInsight } from "../WeeklyInsight";

describe("WeeklyInsight", () => {
  it("shows each pattern for the week", async () => {
    await render(
      <WeeklyInsight
        lines={[
          { kind: "pressure", text: "Your top number averaged 129 this week, 10 lower than last week." },
          { kind: "movement", text: "You reached your movement goal on 5 of the last 7 days." },
        ]}
      />,
    );
    expect(screen.getByRole("header", { name: "Your last 7 days" })).toBeOnTheScreen();
    expect(screen.getByText("Your top number averaged 129 this week, 10 lower than last week.")).toBeOnTheScreen();
    expect(screen.getByText("You reached your movement goal on 5 of the last 7 days.")).toBeOnTheScreen();
  });

  it("says what to log when there's nothing to show yet", async () => {
    await render(<WeeklyInsight lines={[]} />);
    expect(screen.getByText(/Patterns appear here after 3 readings/)).toBeOnTheScreen();
  });
});
