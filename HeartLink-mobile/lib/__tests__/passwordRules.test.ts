import { cleanPassword, meetsPasswordRules } from "../passwordRules";

// 2026-11-17: spaces at the start or end of a new password are dropped (the server drops them too); spaces inside stay.

describe("new passwords", () => {
  it("drop spaces at the start and end only", () => {
    expect(cleanPassword("  A-long-password-2026! ")).toBe("A-long-password-2026!");
    expect(cleanPassword("my red bike 1990 Rides!")).toBe("my red bike 1990 Rides!");
  });

  it("don't reach the length rule with a space at the end", () => {
    // 15 characters and a space: still too short
    expect(meetsPasswordRules("Abcdefghijk12!x ")).toBe(false);
    expect(meetsPasswordRules("Abcdefghijk12!xy ")).toBe(true);
  });
});
