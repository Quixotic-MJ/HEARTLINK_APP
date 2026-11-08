import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccess,
  canAuthorRecipes,
  canReviewRecipes,
  homeFor,
  safeNotificationRoute,
  searchPathFor,
} from "./access.js";

const admin = { role: "admin" };
const dietitian = { role: "medical_expert", expert_type: "Dietitian" };
const physicalTherapist = { role: "medical_expert", expert_type: "Physical Therapist" };
const cardiologist = { role: "medical_expert", expert_type: "Cardiologist" };

test("only admins author recipes", () => {
  assert.equal(canAuthorRecipes(admin), true);
  assert.equal(canAuthorRecipes(dietitian), false);
});

test("only Dietitians formally review recipes", () => {
  assert.equal(canReviewRecipes(dietitian), true);
  assert.equal(canReviewRecipes(admin), false);
  assert.equal(canReviewRecipes(physicalTherapist), false);
});

test("experts land in the part of the portal they own", () => {
  assert.equal(homeFor(admin), "/dashboard");
  assert.equal(homeFor(dietitian), "/foods");
  assert.equal(homeFor(physicalTherapist), "/exercises");
  assert.equal(homeFor(cardiologist), "/notifications");
  assert.equal(homeFor({ role: "medical_expert", expert_type: null }), "/notifications");
  assert.equal(homeFor({ role: "patient" }), "/");
});

test("retired and unknown staff routes are denied", () => {
  for (const path of ["/cases", "/cases/round-1", "/calibration", "/patients", "/patients/p1"])
    assert.equal(canAccess(admin, path), false);
  assert.equal(canAccess(admin, "/not-a-portal-page"), false);
  assert.equal(canAccess(admin, "/foods/unknown"), false);
  assert.equal(canAccess(admin, "/users/u1/unknown"), false);
  assert.equal(canAccess(admin, "/users/u1"), true);
});

test("staff search stays inside the content or account area they own", () => {
  assert.equal(searchPathFor(admin), "/users");
  assert.equal(searchPathFor(dietitian), "/foods");
  assert.equal(searchPathFor(physicalTherapist), "/exercises");
  assert.equal(searchPathFor(cardiologist), null);
});

test("staff can open their own settings without gaining Admin operations", () => {
  for (const staff of [admin, dietitian, physicalTherapist, cardiologist]) {
    assert.equal(canAccess(staff, "/settings"), true);
  }
  for (const expert of [dietitian, physicalTherapist, cardiologist]) {
    for (const path of ["/users", "/broadcasts", "/premium", "/activity-log"]) {
      assert.equal(canAccess(expert, path), false);
    }
  }
  for (const denied of [null, {}, { role: "patient" }, { role: "unknown" }]) {
    assert.equal(canAccess(denied, "/settings"), false);
  }
});

test("notifications only open an allowlisted route for the current staff member", () => {
  assert.equal(safeNotificationRoute(dietitian, "/foods?search=soup"), "/foods?search=soup");
  assert.equal(safeNotificationRoute(cardiologist, "/settings"), "/settings");
  assert.equal(safeNotificationRoute(dietitian, "/exercises"), null);
  assert.equal(safeNotificationRoute(admin, "/patients/p1"), null);
  assert.equal(safeNotificationRoute(admin, "/foods/../patients/p1"), null);
  assert.equal(safeNotificationRoute(admin, "https://example.test/foods"), null);
});
