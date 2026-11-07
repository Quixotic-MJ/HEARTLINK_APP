import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ScoreExplanationModal } from "../ScoreExplanationModal";
import type { HeartFactors } from "../../../services/heartScore";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const FACTORS: HeartFactors = {
  areas: {
    blood_pressure: { points: 25, systolic: 150, diastolic: 95, readings: 2, days: 7 },
    activity: { points: 100, minutes: 200, goal: 150, from: "logs" },
    nicotine: { points: 100, status: "never" },
    diet: { points: 100, sodium_from: "setup" },
  },
  areas_used: 4,
  areas_total: 8,
  average: 81,
  rule: "stage_2_limit",
};

async function show(factors: HeartFactors | null) {
  await render(
    <ScoreExplanationModal visible score={59} tierLabel="Elevated Risk" hasLoggedData factors={factors} onClose={jest.fn()} onNavigateToLogging={jest.fn()} />,
  );
}

describe("ScoreExplanationModal", () => {
  it("shows each area, its points and why, with the limit explained", async () => {
    await show(FACTORS);
    expect(screen.getByText("150/95, average of 2 readings this week")).toBeOnTheScreen();
    expect(screen.getByText("200 of 150 minutes this week")).toBeOnTheScreen();
    expect(screen.getByText("Average of 4 areas")).toBeOnTheScreen();
    expect(screen.getByText("Your average blood pressure is 140/90 or higher, so your score can't go above 59.")).toBeOnTheScreen();
  });

  it("says when an area has no data, and that lab areas aren't scored", async () => {
    await show(FACTORS);
    expect(screen.getByText("No sleep logged this week")).toBeOnTheScreen();
    expect(screen.getByText("Blood sugar and Cholesterol aren't scored for now because they need lab results.")).toBeOnTheScreen();
  });

  it("says plainly what isn't reviewed or validated", async () => {
    await show(FACTORS);
    expect(screen.getByText(/waiting for expert review/)).toBeOnTheScreen();
    expect(screen.getByText(/hasn't been validated/)).toBeOnTheScreen();
  });

  it("explains the starting estimate before the first log", async () => {
    await show({});
    expect(screen.queryByText("Average of 4 areas")).not.toBeOnTheScreen();
    expect(screen.getByText(/This first score is an estimate/)).toBeOnTheScreen();
    expect(screen.getByText(/machine learning model/)).toBeOnTheScreen();
    expect(screen.getByText("Where the points come from")).toBeOnTheScreen();
  });
});
