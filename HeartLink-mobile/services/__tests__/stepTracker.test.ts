import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  BRISK_STEPS_PER_MINUTE, briskPeriods, isStepTrackingAvailable, lastDays, manilaDay, manilaDayBounds, showsSampleSteps,
} from "../stepTracker";

// HL-163: which stretches of walking count as brisk (100+ steps a minute, at least a minute long), cut to the Manila
// day and joined where they touch.

const DAY = "2026-11-20";
const { start, end } = manilaDayBounds(DAY);

function rec(fromMin: number, minutes: number, perMinute: number) {
  const s = new Date(start.getTime() + fromMin * 60000);
  return { startTime: s.toISOString(), endTime: new Date(s.getTime() + minutes * 60000).toISOString(), count: minutes * perMinute };
}

describe("brisk periods", () => {
  it("counts 100 steps a minute and not 99", () => {
    expect(BRISK_STEPS_PER_MINUTE).toBe(100);
    expect(briskPeriods([rec(420, 10, 100)], start, end)).toHaveLength(1);
    expect(briskPeriods([rec(420, 10, 99)], start, end)).toEqual([]);
  });

  it("doesn't count a long record that averages under 100, even if part of it was brisk", () => {
    // 60 minutes, 4,000 steps: about 67 a minute
    expect(briskPeriods([{ ...rec(420, 60, 0), count: 4000 }], start, end)).toEqual([]);
  });

  it("leaves out records shorter than a minute", () => {
    const s = new Date(start.getTime() + 420 * 60000);
    const short = { startTime: s.toISOString(), endTime: new Date(s.getTime() + 30000).toISOString(), count: 80 };
    expect(briskPeriods([short], start, end)).toEqual([]);
  });

  it("joins stretches that touch or overlap, so a phone and a watch don't double a walk", () => {
    const periods = briskPeriods([rec(420, 10, 110), rec(430, 5, 120), rec(425, 10, 105), rec(600, 5, 130)], start, end);
    expect(periods).toEqual([
      [new Date(start.getTime() + 420 * 60000).toISOString(), new Date(start.getTime() + 435 * 60000).toISOString()],
      [new Date(start.getTime() + 600 * 60000).toISOString(), new Date(start.getTime() + 605 * 60000).toISOString()],
    ]);
  });

  it("cuts a walk across midnight to the day", () => {
    const periods = briskPeriods([rec(1435, 10, 110)], start, end);
    expect(periods).toEqual([[new Date(start.getTime() + 1435 * 60000).toISOString(), end.toISOString()]]);
  });

  it("skips records it can't read", () => {
    expect(briskPeriods([{ startTime: "nope", endTime: "nope", count: 500 }], start, end)).toEqual([]);
  });
});

describe("Manila days", () => {
  it("uses the day in Manila, not on the phone's clock", () => {
    // 4:30 pm UTC on the 19th is 12:30 am on the 20th in Manila
    expect(manilaDay(new Date("2026-11-19T16:30:00Z"))).toBe("2026-11-20");
    expect(start.toISOString()).toBe("2026-11-19T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-20T16:00:00.000Z");
  });

  it("lists the last 7 days, oldest first, ending today", () => {
    expect(lastDays(new Date("2026-11-20T04:00:00Z"))).toEqual([
      "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20",
    ]);
  });
});

it("isn't available without the Health Connect native part (Expo Go, iPhone, tests)", () => {
  expect(isStepTrackingAvailable()).toBe(false);
});

it("shows sample steps only in Expo Go, never in an installed app", () => {
  const original = Constants.executionEnvironment;
  try {
    Object.defineProperty(Constants, "executionEnvironment", { value: ExecutionEnvironment.StoreClient, configurable: true });
    expect(showsSampleSteps()).toBe(true);
    Object.defineProperty(Constants, "executionEnvironment", { value: ExecutionEnvironment.Standalone, configurable: true });
    expect(showsSampleSteps()).toBe(false);
  } finally {
    Object.defineProperty(Constants, "executionEnvironment", { value: original, configurable: true });
  }
});
