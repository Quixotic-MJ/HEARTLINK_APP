import { overlapMessage, overlappingSleep } from "../sleepOverlap";

// 10 PM to 6 AM in the Philippines (UTC+8)
const NIGHT = { bedtime: "2026-11-18T14:00:00Z", wake_time: "2026-11-18T22:00:00Z" };
const at = (iso: string) => new Date(iso);

describe("Sleep log: the same night can't be logged twice (2026-11-19)", () => {
  it("finds the same night logged again, or part of it", () => {
    expect(overlappingSleep(at(NIGHT.bedtime), at(NIGHT.wake_time), [NIGHT])).toBe(NIGHT);
    expect(overlappingSleep(at("2026-11-18T20:00:00Z"), at("2026-11-18T23:00:00Z"), [NIGHT])).toBe(NIGHT);
  });

  it("lets a nap at another time through, and sleep that only touches", () => {
    expect(overlappingSleep(at("2026-11-19T05:00:00Z"), at("2026-11-19T06:00:00Z"), [NIGHT])).toBeNull();
    expect(overlappingSleep(at("2026-11-18T22:00:00Z"), at("2026-11-18T23:00:00Z"), [NIGHT])).toBeNull();
  });

  it("skips logs without times and deleted logs, and works with no logs loaded", () => {
    expect(overlappingSleep(at(NIGHT.bedtime), at(NIGHT.wake_time), [{ bedtime: null }, { ...NIGHT, is_deleted: true }])).toBeNull();
    expect(overlappingSleep(at(NIGHT.bedtime), at(NIGHT.wake_time), undefined)).toBeNull();
  });

  it("says which sleep is already logged", () => {
    expect(overlapMessage(NIGHT)).toMatch(/^You already logged sleep from .+ to .+\. A nap at another time can still be added\.$/);
  });
});
