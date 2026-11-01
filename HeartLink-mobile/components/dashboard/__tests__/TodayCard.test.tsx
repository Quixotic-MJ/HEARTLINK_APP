import { partsText, readingLevel } from "../TodayCard";

describe("readingLevel (the latest reading's tag on the dashboard)", () => {
  it("uses the app's emergency thresholds", () => {
    expect(readingLevel(180, 90)).toEqual({ text: "Emergency level", emergency: true });
    expect(readingLevel(150, 120)).toEqual({ text: "Emergency level", emergency: true });
    expect(readingLevel(89, 70)).toEqual({ text: "Emergency level", emergency: true });
    expect(readingLevel(110, 59)).toEqual({ text: "Emergency level", emergency: true });
  });

  it("names the everyday levels in plain words", () => {
    expect(readingLevel(118, 76).text).toBe("Healthy range");
    expect(readingLevel(125, 78).text).toBe("A little high");
    expect(readingLevel(126, 82).text).toBe("Above the healthy range");
    expect(readingLevel(179, 119).text).toBe("Above the healthy range");
  });
});

describe("partsText (how the score adds up, under the heart)", () => {
  it("adds the readings part and the habit points", () => {
    expect(partsText({ readings: 74, habits: 2, habits_today: true })).toBe("74 from your readings + 2 from today's habits");
    expect(partsText({ readings: 74, habits: -3, habits_today: true })).toBe("74 from your readings − 3 from today's habits");
    expect(partsText({ readings: 77, habits: 2, habits_today: false })).toBe("77 from your readings + 2 from yesterday's habits");
    expect(partsText({ readings: 74, habits: 0, habits_today: true })).toBe("74 from your readings, no habit points yet today");
  });
});
