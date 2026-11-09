import test from "node:test";
import assert from "node:assert/strict";
import { formatReviewDate } from "./formatReviewDate.js";

test("review dates use the labelled Philippine calendar day, not the device timezone", () => {
  assert.equal(
    formatReviewDate("2026-11-07T23:30:00Z"),
    "Nov 8, 2026 (Asia/Manila)",
  );
  assert.equal(
    formatReviewDate("2026-11-08T23:30:00-08:00"),
    "Nov 9, 2026 (Asia/Manila)",
  );
});

test("unrecorded or invalid review dates stay unavailable", () => {
  for (const value of [undefined, null, 0, "", "  ", "not-a-date"]) {
    assert.equal(formatReviewDate(value), "");
  }
});
