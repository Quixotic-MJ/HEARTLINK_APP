import React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { HeartRiskCard } from "../HeartRiskCard";
import { HeartRisk, percentText } from "../../../services/heartRisk";

// HL-144: the Dashboard's Heart risk card, in each of its states.
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const CALCULATED: HeartRisk = {
  available: true, kind: "calculated", ascvd_10: 9.2, ascvd_30: null, band: "intermediate", age: 50,
  note: "Discuss your heart risk with your doctor at your next checkup.", missing_labs: [],
  sbp: { value: 160, from: "daytime_average", readings: 3 },
};

function show(risk: HeartRisk | null, onAnswerQuestions = jest.fn(), onAddLabResults = jest.fn()) {
  return render(<HeartRiskCard risk={risk} onAnswerQuestions={onAnswerQuestions} onAddLabResults={onAddLabResults} />);
}

describe("HeartRiskCard", () => {
  it("shows a calculated risk with its band and the doctor note", async () => {
    await show(CALCULATED);
    expect(screen.getByText("9.2%")).toBeOnTheScreen();
    expect(screen.getByText("Intermediate")).toBeOnTheScreen();
    expect(screen.getByText(/Discuss your heart risk with your doctor/)).toBeOnTheScreen();
    expect(screen.queryByText("Estimated")).not.toBeOnTheScreen();
    expect(screen.getByText(/not a diagnosis/)).toBeOnTheScreen();
  });

  it("tags an estimate; the details, the 30-year view and Add lab results are one tap away", async () => {
    const user = userEvent.setup();
    const onAddLabResults = jest.fn();
    await show({ ...CALCULATED, kind: "estimated", ascvd_10: 2.1, band: "low", note: null, missing_labs: ["cholesterol", "kidney"],
                 ascvd_30: 11.4 }, undefined, onAddLabResults);
    expect(screen.getByText("Estimated")).toBeOnTheScreen();
    expect(screen.queryByText(/Over 30 years: 11.4%/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /About your heart risk/ }));
    expect(screen.getByText(/Over 30 years: 11.4%/)).toBeOnTheScreen();
    expect(screen.getByText(/Estimated from your answers/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Add lab results" }));
    expect(onAddLabResults).toHaveBeenCalledTimes(1);
  });

  it("without the three answers, links to Settings instead of asking on the Dashboard", async () => {
    const user = userEvent.setup();
    const onAnswerQuestions = jest.fn();
    await show({ available: false, reason: "questions" }, onAnswerQuestions);
    expect(screen.getByText("See your heart risk")).toBeOnTheScreen();
    expect(screen.queryByText("Do you take medicine for blood pressure?")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /See your heart risk/ }));
    expect(onAnswerQuestions).toHaveBeenCalledTimes(1);
  });

  it("asks for a reading when the risk used a typical blood pressure", async () => {
    const user = userEvent.setup();
    const onLog = jest.fn();
    await render(
      <HeartRiskCard risk={{ ...CALCULATED, kind: "estimated", sbp: null, note: null, missing_labs: ["cholesterol", "kidney"] }}
        onAnswerQuestions={jest.fn()} onAddLabResults={jest.fn()} onLogBloodPressure={onLog} />,
    );
    expect(screen.getByText(/so this uses a typical value/)).toBeOnTheScreen();
    await user.press(screen.getByRole("link", { name: "Log blood pressure" }));
    expect(onLog).toHaveBeenCalledTimes(1);
  });

  it("doesn't ask for a reading when one was used", async () => {
    await show(CALCULATED);
    expect(screen.queryByText(/so this uses a typical value/)).not.toBeOnTheScreen();
  });

  it("explains the age limit", async () => {
    await show({ available: false, reason: "age", age: 24 });
    expect(screen.getByText(/start at age 30/)).toBeOnTheScreen();
  });

  it("opens About your heart risk", async () => {
    const user = userEvent.setup();
    await show(CALCULATED);
    await user.press(screen.getByRole("button", { name: /About your heart risk/ }));
    expect(screen.getByText("What it means")).toBeOnTheScreen();
    expect(screen.getByText(/average of 3 daytime readings/)).toBeOnTheScreen();
  });

  it("writes small risks plainly", () => {
    expect(percentText(0.4)).toBe("Under 1%");
    expect(percentText(4.0)).toBe("4%");
    expect(percentText(12.35)).toBe("12.3%");
  });
});
