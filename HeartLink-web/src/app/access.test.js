import assert from "node:assert/strict";
import test from "node:test";

import { canAuthorRecipes, canReviewRecipes, homeFor } from "./access.js";

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
  assert.equal(homeFor(cardiologist), "/patients");
});
