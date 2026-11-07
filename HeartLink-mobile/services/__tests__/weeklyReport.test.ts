import AsyncStorage from "@react-native-async-storage/async-storage";
import { getWeeklyReportOpenedAt, isWeeklyReportReady, markWeeklyReportOpened } from "../weeklyReport";

const NOW = new Date(2026, 10, 20, 9, 0);
const ENOUGH = { logged_days: 3, account_age_days: 7 };
const daysAgo = (days: number, hour = 21) => new Date(2026, 10, 20 - days, hour, 0).toISOString();

describe("isWeeklyReportReady", () => {
  it("is ready after 7 days with 3 logged days, if never opened", () => {
    expect(isWeeklyReportReady(ENOUGH, null, NOW)).toBe(true);
  });

  it("waits for a new account's first 7 days", () => {
    expect(isWeeklyReportReady({ logged_days: 6, account_age_days: 6 }, null, NOW)).toBe(false);
  });

  it("waits until there's enough logged", () => {
    expect(isWeeklyReportReady({ logged_days: 2, account_age_days: 30 }, null, NOW)).toBe(false);
  });

  it("goes away once opened and comes back 7 calendar days later", () => {
    expect(isWeeklyReportReady(ENOUGH, daysAgo(0), NOW)).toBe(false);
    expect(isWeeklyReportReady(ENOUGH, daysAgo(6), NOW)).toBe(false);
    expect(isWeeklyReportReady(ENOUGH, daysAgo(7), NOW)).toBe(true);
  });

  it("stays hidden after 7 days if too little was logged", () => {
    expect(isWeeklyReportReady({ logged_days: 1, account_age_days: 30 }, daysAgo(8), NOW)).toBe(false);
  });

  it("never claims it's ready without the server's numbers", () => {
    expect(isWeeklyReportReady(undefined, null, NOW)).toBe(false);
    expect(isWeeklyReportReady(null, null, NOW)).toBe(false);
    expect(isWeeklyReportReady({}, null, NOW)).toBe(false);
  });
});

describe("remembering when it was opened", () => {
  it("is kept separately for each account", async () => {
    await AsyncStorage.clear();
    await markWeeklyReportOpened("user-1", NOW);
    expect(await getWeeklyReportOpenedAt("user-1")).toBe(NOW.toISOString());
    expect(await getWeeklyReportOpenedAt("user-2")).toBeNull();
  });
});
