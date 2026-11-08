import test from "node:test";
import assert from "node:assert/strict";
import { canAccess } from "./access.js";
import {
  portalNavigationFor,
  portalSearchTargetsFor,
} from "./portalNavigation.js";

test("portal navigation and record-search shortcuts stay role-scoped", () => {
  for (const [user, expected] of [
    [{ role: "admin" }, ["/users", "/foods", "/exercises"]],
    [{ role: "medical_expert", expert_type: "Dietitian" }, ["/foods"]],
    [
      { role: "medical_expert", expert_type: "Physical Therapist" },
      ["/exercises"],
    ],
    [{ role: "medical_expert", expert_type: "Cardiologist" }, []],
    [null, []],
  ]) {
    const pages = portalNavigationFor(user);
    assert.equal(new Set(pages.map((page) => page.path)).size, pages.length);
    assert.ok(pages.every((page) => canAccess(user, page.path)));
    assert.deepEqual(
      portalSearchTargetsFor(user).map((page) => page.path),
      expected,
    );
  }
  assert.equal(
    portalSearchTargetsFor({ role: "admin" }, "/exercises")[0].path,
    "/exercises",
  );
  assert.deepEqual(
    portalNavigationFor({
      role: "medical_expert",
      expert_type: "Cardiologist",
    }).map((page) => page.path),
    ["/notifications", "/settings"],
  );
});
