import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { ProgressSummaryCard } from "../ProgressSummaryCard";
import { hasSummary, summarySource } from "../../../services/progressSummary";

// The AI summary at the top of Trends (2026-11-12).
describe("ProgressSummaryCard", () => {
  it("shows the AI's paragraph and says the AI wrote it", async () => {
    await render(
      <ProgressSummaryCard
        days={7}
        loading={false}
        failed={false}
        onRetry={jest.fn()}
        summary={{ days: 7, lines: ["You logged something on 5 of the last 7 days."], text: "Ana, you logged on 5 of the last 7 days.", ai_written: true }}
      />,
    );
    expect(screen.getByText("AI summary")).toBeOnTheScreen();
    expect(screen.getByText("Your last 7 days")).toBeOnTheScreen();
    expect(screen.getByText("Ana, you logged on 5 of the last 7 days.")).toBeOnTheScreen();
    expect(screen.getByText(/Written by AI/)).toBeOnTheScreen();
  });

  it("shows the plain facts when the AI wasn't used", async () => {
    await render(
      <ProgressSummaryCard
        days={14}
        loading={false}
        failed={false}
        onRetry={jest.fn()}
        summary={{ days: 14, lines: ["A.", "B."], text: "A. B.", ai_written: false }}
      />,
    );
    expect(screen.getByText("A. B.")).toBeOnTheScreen();
    expect(screen.getByText("From what you logged. It isn't medical advice.")).toBeOnTheScreen();
  });

  it("invites logging when the period is empty, and offers a retry when it fails", async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    const { rerender } = await render(
      <ProgressSummaryCard days={30} loading={false} failed={false} onRetry={onRetry} summary={{ days: 30, lines: [], text: "", ai_written: false }} />,
    );
    expect(screen.getByText(/a summary of your last 30 days shows here/)).toBeOnTheScreen();
    await rerender(<ProgressSummaryCard days={30} loading={false} failed onRetry={onRetry} summary={undefined} />);
    await user.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("covers only 7, 14 and 30 days", () => {
    expect([7, 14, 30, 90, 365].map(hasSummary)).toEqual([true, true, true, false, false]);
    expect(summarySource({ ai_written: false })).toBe("From what you logged. It isn't medical advice.");
  });
});
