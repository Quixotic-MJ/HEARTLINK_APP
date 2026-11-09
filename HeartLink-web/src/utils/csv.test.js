import assert from "node:assert/strict";
import test from "node:test";
import { csvCell, toCsv } from "./csv.js";

test("untrusted spreadsheet cells cannot start formulas after whitespace or controls", () => {
  for (const value of ["=1+1", "+1", "-1", "@SUM(1)", "  =1+1", "\t=1+1", "\r=1+1", "\n=1+1", "\uFEFF=1+1"]) {
    assert.ok(csvCell(value).replace(/^"/, "").startsWith("'"), JSON.stringify(value));
  }
});

test("CSV preserves ordinary text, quotes, unknown cells and UTF-8 labels", () => {
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(42), "42");
  assert.equal(csvCell('A, "B"'), '"A, ""B"""');
  assert.equal(toCsv([{ name: "Peña", missing: null }], [{ label: "Name", value: row => row.name }, { label: "Unknown", value: row => row.missing }]), "\uFEFFName,Unknown\r\nPeña,\r\n");
});
