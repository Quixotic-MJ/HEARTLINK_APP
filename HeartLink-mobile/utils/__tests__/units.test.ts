import { unitForAmount } from "../units";

describe("unitForAmount (HL-031)", () => {
  it("uses the plural for count units above one", () => {
    expect(unitForAmount("clove", 2)).toBe("cloves");
    expect(unitForAmount("cup", "1.5")).toBe("cups");
    expect(unitForAmount("slice", 3)).toBe("slices");
  });

  it("keeps the singular for one or less", () => {
    expect(unitForAmount("clove", 1)).toBe("clove");
    expect(unitForAmount("cup", 0.5)).toBe("cup");
  });

  it("never changes measurement units or old plural spellings", () => {
    expect(unitForAmount("g", 200)).toBe("g");
    expect(unitForAmount("tbsp", 2)).toBe("tbsp");
    expect(unitForAmount("pc", 4)).toBe("pc");
    expect(unitForAmount("cloves", 4)).toBe("cloves");
  });

  it("handles a missing unit or amount", () => {
    expect(unitForAmount(null, 2)).toBe("");
    expect(unitForAmount("cup", null)).toBe("cup");
  });
});
