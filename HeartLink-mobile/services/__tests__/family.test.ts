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
