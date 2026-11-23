import { agoLine, cleanCode, expiresLine, familyCanOpen, inviteMessage, isFamilyAccount, showCode, summaryChart } from "../family";

// HL-087: family sharing helpers.

describe("invite codes", () => {
  it("turn what's typed into the code", () => {
    expect(cleanCode("k7m-q2p")).toBe("K7MQ2P");
    expect(cleanCode(" K7M Q2P ")).toBe("K7MQ2P");
    expect(cleanCode("K7MQ2PXYZ")).toBe("K7MQ2P");
    // letters and numbers that are never in a code (0, O, 1, I, L) are dropped
    expect(cleanCode("O0I1L")).toBe("");
  });

  it("show as two groups of three", () => {
    expect(showCode("K7MQ2P")).toBe("K7M-Q2P");
    expect(showCode("K7M")).toBe("K7M");
    expect(showCode("K7MQ")).toBe("K7M-Q");
  });

  it("say when they expire", () => {
    const now = new Date(2026, 9, 27, 10, 0);
    expect(expiresLine(new Date(2026, 9, 27, 19, 5).toISOString(), now)).toBe("Expires today at 7:05 PM");
    expect(expiresLine(new Date(2026, 9, 28, 9, 30).toISOString(), now)).toBe("Expires tomorrow at 9:30 AM");
  });

  it("go out with how to use them", () => {
    expect(inviteMessage("K7MQ2P")).toContain("enter this code: K7M-Q2P. It works once, for 24 hours.");
  });
});

describe("times", () => {
  const now = new Date(2026, 9, 27, 12, 0);
  const before = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();
  it("read as how long ago", () => {
    expect(agoLine(before(0), now)).toBe("Just now");
    expect(agoLine(before(25), now)).toBe("25 minutes ago");
    expect(agoLine(before(60), now)).toBe("1 hour ago");
    expect(agoLine(before(60 * 5), now)).toBe("5 hours ago");
    expect(agoLine(before(60 * 24), now)).toBe("Yesterday");
    expect(agoLine(before(60 * 24 * 3), now)).toBe("3 days ago");
    expect(agoLine(new Date(2026, 9, 9).toISOString(), now)).toBe("Oct 9");
    expect(agoLine(null, now)).toBe("Never");
  });
});

describe("family-only accounts", () => {
  it("are told apart by account_kind", () => {
    expect(isFamilyAccount({ account_kind: "family" })).toBe(true);
    expect(isFamilyAccount({ account_kind: "patient" })).toBe(false);
    expect(isFamilyAccount(null)).toBe(false);
  });

  it("only open their Family screens, Settings and Notifications", () => {
    expect(familyCanOpen(["(family)"])).toBe(true);
    expect(familyCanOpen(["(family)", "follow"])).toBe(true);
    expect(familyCanOpen(["(home)", "(settings)", "settings"])).toBe(true);
    expect(familyCanOpen(["(home)", "(profile)", "notifications"])).toBe(true);
    expect(familyCanOpen(["(home)", "(tabs)", "dashboard"])).toBe(false);
    expect(familyCanOpen(["(home)", "(profile)", "profile"])).toBe(false);
    expect(familyCanOpen(["(baseline)", "plan"])).toBe(false);
    expect(familyCanOpen(["(auth)", "verification-success"])).toBe(false);
  });
});

describe("the 30-day charts", () => {
  it("leave a day with nothing logged empty", () => {
    const chart = summaryChart([
      { date: "2026-10-26", systolic: 138, diastolic: 88, score: 71 },
      { date: "2026-10-27", systolic: null, diastolic: null, score: null },
    ]);
    expect(chart.days.map((d) => d.key)).toEqual(["2026-10-26", "2026-10-27"]);
    expect(chart.days[0].date.getDate()).toBe(26);
    expect(chart.pressure).toEqual([{ sys: 138, dia: 88 }, null]);
    expect(chart.scores).toEqual([71, null]);
  });
});

// HL-161: the last 7 days in plain words for family members
describe("the week for family members", () => {
  const { bpCategory, weekSentence, weekDayLabel, BP_WORDS } = jest.requireActual("../family") as typeof import("../family");
  const NOW = new Date(2026, 10, 17, 12, 0);
  const day = (date: string, bp: [number, number] | null, _unused: boolean | null = null, logged = !!bp) => ({
    date,
    bp: bp ? { systolic: bp[0], diastolic: bp[1], category: bpCategory(bp[0], bp[1]), readings: 1 } : null,
    pulse: null,
    logged,
  });

  it("uses the same blood pressure categories as the server, including both emergency limits", () => {
    expect(bpCategory(118, 76)).toBe("normal");
    expect(bpCategory(124, 78)).toBe("elevated");
    expect(bpCategory(132, 78)).toBe("stage_1");
    expect(bpCategory(142, 90)).toBe("stage_2");
    expect(bpCategory(180, 100)).toBe("crisis");
    expect(bpCategory(110, 120)).toBe("crisis");
    expect(bpCategory(88, 70)).toBe("low");
    expect(BP_WORDS.crisis.urgent && BP_WORDS.low.urgent && !BP_WORDS.stage_2.urgent).toBe(true);
  });

  it("names the days plainly", () => {
    expect(weekDayLabel("2026-11-17", NOW)).toBe("Today");
    expect(weekDayLabel("2026-11-16", NOW)).toBe("Yesterday");
    expect(weekDayLabel("2026-11-12", NOW)).toBe("Thu, Nov 12");
  });

  it("sums up the week in a sentence", () => {
    const days = [
      day("2026-11-17", [142, 90], false),
      day("2026-11-16", null),
      day("2026-11-15", [118, 76], true),
      day("2026-11-14", [116, 74], true),
      day("2026-11-13", null, null, true),
      day("2026-11-12", null),
      day("2026-11-11", null),
    ];
    const week = { days, readings: 3, highest: { systolic: 142, diastolic: 90, category: "stage_2" as const, date: "2026-11-17" } };
    expect(weekSentence("Ana R.", week, NOW)).toBe(
      "Ana R. logged something on 4 of the last 7 days. Blood pressure on 3 days, mostly Normal. The highest was 142/90 (Very high) today."
    );
  });

  it("says plainly when nothing or no blood pressure was logged", () => {
    const empty = { days: [day("2026-11-17", null)], readings: 0, highest: null };
    expect(weekSentence("Ana R.", empty, NOW)).toBe("Ana R. didn't log anything in the last 7 days.");
    const noBp = { days: [day("2026-11-17", null, true, true)], readings: 0, highest: null };
    expect(weekSentence("Ana R.", noBp, NOW)).toBe("Ana R. logged something on 1 of the last 7 days. There were no blood pressure readings.");
  });
});
