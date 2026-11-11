import { focusArea, readingLevel } from "../TodayCard";

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

describe("focusArea (the habit to work on next, HL-144)", () => {
  const area = (points: number) => ({ points });
  it("picks the area with the fewest points, the first one on a tie", () => {
    expect(focusArea({ areas: { blood_pressure: area(50), activity: area(0), sleep: area(100), diet: area(0) } } as never))
      .toEqual({ label: "Activity", points: 0 });
  });
  it("is null when every area scores 100, or there are no areas", () => {
    expect(focusArea({ areas: { sleep: area(100), nicotine: area(100) } } as never)).toBeNull();
    expect(focusArea(null)).toBeNull();
  });
});
