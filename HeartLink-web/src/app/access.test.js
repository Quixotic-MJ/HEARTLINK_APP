import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccess,
  canAuthorExercises,
  canAuthorRecipes,
  canReviewExercises,
  canReviewRecipes,
  homeFor,
  safeNotificationRoute,
  searchPathFor,
} from "./access.js";

const admin = { role: "admin" };
const dietitian = { role: "medical_expert", expert_type: "Dietitian" };
const physicalTherapist = { role: "medical_expert", expert_type: "Physical Therapist" };
const cardiologist = { role: "medical_expert", expert_type: "Cardiologist" };

test("Admins and Dietitians write recipes; Admins and PTs write exercises (HL-136)", () => {
  assert.equal(canAuthorRecipes(admin), true);
  assert.equal(canAuthorRecipes(dietitian), true);
  assert.equal(canAuthorRecipes(physicalTherapist), false);
  assert.equal(canAuthorRecipes(cardiologist), false);
  assert.equal(canAuthorExercises(admin), true);
  assert.equal(canAuthorExercises(physicalTherapist), true);
  assert.equal(canAuthorExercises(dietitian), false);
});

test("only PTs approve exercises", () => {
  assert.equal(canReviewExercises(physicalTherapist), true);
  assert.equal(canReviewExercises(admin), false);
  assert.equal(canReviewExercises(dietitian), false);
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
  assert.equal(homeFor(cardiologist), "/app-users");
  assert.equal(homeFor({ role: "medical_expert", expert_type: null }), "/notifications");
  assert.equal(homeFor({ role: "patient" }), "/");
});

test("user records are for the care team only; everyone reviews cases; Model Check is Admins only", () => {
  for (const path of ["/app-users", "/app-users/p1"]) {
    assert.equal(canAccess(admin, path), false);
    for (const expert of [cardiologist, dietitian, physicalTherapist]) assert.equal(canAccess(expert, path), true);
  }
  for (const path of ["/cases", "/cases/round-1"])
    for (const staff of [admin, cardiologist, dietitian, physicalTherapist]) assert.equal(canAccess(staff, path), true);
  assert.equal(canAccess(admin, "/calibration"), true);
  for (const expert of [cardiologist, dietitian, physicalTherapist]) assert.equal(canAccess(expert, "/calibration"), false);
  for (const denied of [null, { role: "patient" }]) assert.equal(canAccess(denied, "/app-users"), false);
});

test("unknown staff routes are denied", () => {
  assert.equal(canAccess(admin, "/calibration/x"), false);
  assert.equal(canAccess(admin, "/not-a-portal-page"), false);
  assert.equal(canAccess(admin, "/foods/unknown"), false);
  assert.equal(canAccess(admin, "/users/u1/unknown"), false);
  assert.equal(canAccess(cardiologist, "/app-users/p1/unknown"), false);
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
  assert.equal(safeNotificationRoute(admin, "/app-users/p1"), null);
  assert.equal(safeNotificationRoute(dietitian, "/app-users/p1"), "/app-users/p1");
  // 2026-11-24: older notifications still point at /patients and open the new page
  assert.equal(safeNotificationRoute(dietitian, "/patients/p1"), "/app-users/p1");
  assert.equal(safeNotificationRoute(admin, "/foods/../patients/p1"), null);
  assert.equal(safeNotificationRoute(admin, "https://example.test/foods"), null);
});
