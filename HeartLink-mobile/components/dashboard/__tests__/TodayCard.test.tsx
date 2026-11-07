import { readingLevel } from "../TodayCard";

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
