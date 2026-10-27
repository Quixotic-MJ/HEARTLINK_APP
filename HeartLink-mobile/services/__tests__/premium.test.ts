import { endDateLabel, isPremiumProfile, peso, premiumStatusLine, priceFor, yearlySaving, PREMIUM_FEATURES } from "../premium";

describe("Premium wording and prices (HL-084)", () => {
  const prices = { monthly_price_php: 99, yearly_price_php: 899 };

  it("formats pesos without decimals", () => {
    expect(peso(899)).toBe("₱899");
    expect(peso(1188)).toBe("₱1,188");
  });

  it("works out what a year saves against twelve months", () => {
    expect(yearlySaving(prices)).toBe(289);
    expect(yearlySaving({ monthly_price_php: 50, yearly_price_php: 900 })).toBe(0);
  });

  it("picks the price for the chosen period", () => {
    expect(priceFor(prices, "monthly")).toBe(99);
    expect(priceFor(prices, "yearly")).toBe(899);
  });

  it("describes where Premium came from and when it ends", () => {
    const until = "2026-11-03T08:00:00+00:00";
    expect(endDateLabel(until)).toBe("Nov 3, 2026");
    expect(premiumStatusLine({ source: "trial", premium_until: until, days_left: 6 })).toBe("Free trial until Nov 3, 2026 (6 days left)");
    expect(premiumStatusLine({ source: "admin", premium_until: until, days_left: 1 })).toBe("Given by HeartLink until Nov 3, 2026 (1 day left)");
    expect(premiumStatusLine({ source: "checkout", premium_until: null, days_left: 0 })).toBe("Premium");
  });

  it("reads Premium from the cached profile only while it lasts", () => {
    const now = new Date("2026-10-27T00:00:00Z");
    expect(isPremiumProfile({ plan: "premium", premium_until: "2026-11-01T00:00:00Z" }, now)).toBe(true);
    expect(isPremiumProfile({ plan: "premium", premium_until: "2026-10-26T00:00:00Z" }, now)).toBe(false);
    expect(isPremiumProfile({ plan: "free", premium_until: "2026-11-01T00:00:00Z" }, now)).toBe(false);
    expect(isPremiumProfile({ plan: "premium", premium_until: null }, now)).toBe(false);
    expect(isPremiumProfile(null, now)).toBe(false);
  });

  it("doesn't promise features that aren't built yet", () => {
    expect(PREMIUM_FEATURES.map((f) => f.key)).toEqual(["reports", "trends", "family"]);
    expect(PREMIUM_FEATURES.every((f) => !f.ready)).toBe(true);
  });
});
