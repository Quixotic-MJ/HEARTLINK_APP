import test from "node:test";
import assert from "node:assert/strict";
import { manilaDateParts, monthDays, moveMonth } from "./calendar.js";

test("calendar aligns weekdays and includes only the actual dates in 28–31 day months", () => {
  for (const [year, month, count, weekday] of [
    [2023, 1, 28, 3], [2024, 1, 29, 4], [2026, 3, 30, 3], [2026, 10, 30, 0], [2026, 0, 31, 4],
  ]) {
    const weeks = monthDays(year, month);
    const days = weeks.flat().filter((day) => day !== null);
    assert.equal(weeks[0].indexOf(1), weekday);
    assert.deepEqual(days, Array.from({ length: count }, (_, index) => index + 1));
    assert.ok(weeks.every((week) => week.length === 7));
  }
});

test("calendar crosses December and January without losing the year", () => {
  assert.deepEqual(moveMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(moveMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test("today changes at Manila midnight, independent of the browser timezone", () => {
  assert.deepEqual(manilaDateParts(new Date("2026-12-31T15:59:59Z")), { year: 2026, month: 11, day: 31 });
  assert.deepEqual(manilaDateParts(new Date("2026-12-31T16:00:00Z")), { year: 2027, month: 0, day: 1 });
});
