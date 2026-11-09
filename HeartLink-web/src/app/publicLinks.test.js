import assert from "node:assert/strict";
import test from "node:test";
import { safeDownloadUrl } from "./publicLinks.js";

test("Android availability only links to a configured HTTPS destination without credentials", () => {
  assert.equal(safeDownloadUrl("https://downloads.example.test/heartlink.apk"), "https://downloads.example.test/heartlink.apk");
  for (const value of [undefined, "", "javascript:alert(1)", "http://example.test/app.apk", "https://name:secret@example.test/app.apk", "//example.test/app.apk"]) {
    assert.equal(safeDownloadUrl(value), null);
  }
});
