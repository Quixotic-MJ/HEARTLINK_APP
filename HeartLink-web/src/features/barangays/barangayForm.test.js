import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_FORM, formErrors, numbersChanged, statusOf, toForm, toPayload, validPhone } from "./barangayForm.js";

// HL-171: the "Barangay contacts" form.

const row = {
  id: "lahug", name: "Lahug", city: "Cebu City", hall_address: null, latitude: 10.33, longitude: 123.9,
  location_kind: "hall", hotline_1: "032 231 1234", hotline_2: null, numbers_checked: true,
  checked_at: "2026-11-25T03:00:00", note: null,
};

test("checks the fields in plain words", () => {
  assert.deepEqual(formErrors({ ...EMPTY_FORM, name: "X" }), {});
  assert.match(formErrors(EMPTY_FORM).name, /name/);
  assert.match(formErrors({ ...EMPTY_FORM, name: "X", latitude: "10.3" }).location, /two numbers/);
  assert.match(formErrors({ ...EMPTY_FORM, name: "X", latitude: "95", longitude: "123" }).location, /two numbers/);
  assert.match(formErrors({ ...EMPTY_FORM, name: "X", hotline_1: "call me" }).hotline_1, /digits/);
  assert.match(formErrors({ ...EMPTY_FORM, name: "X", numbers_checked: true }).numbers_checked, /hotline/);
  for (const ok of ["032 255 1234", "0917-123-4567", "+63 32 255 1234", "(032) 255-1234", "911"]) assert.ok(validPhone(ok), ok);
  for (const bad of ["12", "abc", "032 abc"]) assert.equal(validPhone(bad), false, bad);
});

test("sends only what changed on an edit", () => {
  const form = toForm(row);
  assert.deepEqual(toPayload(form, row), {});
  assert.deepEqual(toPayload({ ...form, note: "Open 24 hours" }, row), { note: "Open 24 hours" });
  // a new number: the tick is cleared in the form and has to be given again
  const changed = { ...form, hotline_1: "032 231 9999", numbers_checked: false };
  assert.ok(numbersChanged(changed, row));
  assert.deepEqual(toPayload(changed, row), { hotline_1: "032 231 9999", numbers_checked: false });
  assert.deepEqual(toPayload({ ...changed, numbers_checked: true }, row), { hotline_1: "032 231 9999", numbers_checked: true });
});

test("a new barangay sends every field", () => {
  const payload = toPayload({ ...EMPTY_FORM, name: " Budlaan ", latitude: "10.378", longitude: "123.886" }, null);
  assert.equal(payload.name, "Budlaan");
  assert.equal(payload.latitude, 10.378);
  assert.equal(payload.location_kind, "hall");
  assert.equal(payload.numbers_checked, false);
});

test("says each number's status", () => {
  assert.match(statusOf(row).label, /^Checked Nov 25$/);
  assert.equal(statusOf({ ...row, numbers_checked: false }).label, "Not checked");
  assert.equal(statusOf({ ...row, hotline_1: null }).label, "No number");
});
