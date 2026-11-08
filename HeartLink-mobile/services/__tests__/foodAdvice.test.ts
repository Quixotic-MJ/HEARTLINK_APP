import { foodImpact } from "../foodAdvice";

describe("foodImpact", () => {
  it("states the amount and never calls a food forbidden", () => {
    const high = foodImpact(1200, 2);
    expect(high.tone).toBe("high");
    expect(high.title).toBe("High in sodium");
    expect(high.desc).toContain("1,200 mg of sodium");
    expect(high.desc).toContain("smaller serving");
    expect(`${high.title} ${high.desc}`).not.toMatch(/forbidden|avoid|never eat|not allowed/i);
  });

  it("doesn't blame sodium when saturated fat is the reason", () => {
    const fat = foodImpact(100, 8);
    expect(fat.tone).toBe("high");
    expect(fat.title).toBe("High in saturated fat");
    expect(fat.desc).not.toContain("sodium");
  });

  it("names both when both are high", () => {
    expect(foodImpact(900, 7).title).toBe("High in sodium and saturated fat");
  });

  it("keeps the same limits as before", () => {
    expect(foodImpact(800, 6).tone).toBe("medium");
    expect(foodImpact(801, 0).tone).toBe("high");
    expect(foodImpact(400, 3).tone).toBe("low");
    expect(foodImpact(401, 0).tone).toBe("medium");
  });

  it("makes no health claim about a lower food", () => {
    const low = foodImpact(120, 0.5);
    expect(low.title).toBe("Lower in sodium and saturated fat");
    expect(low.desc).toContain("120 mg of sodium");
    expect(low.desc).toContain("0.5 g of saturated fat");
  });
});
