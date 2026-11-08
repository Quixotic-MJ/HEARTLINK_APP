import test from "node:test";
import assert from "node:assert/strict";
import { ingredientArtwork } from "./ingredientArtwork.js";

test("ingredient artwork supports common local names without making up a match", () => {
  assert.equal(ingredientArtwork("  BAWANG  "), "garlic");
  assert.equal(ingredientArtwork("chopped red onion"), "onion");
  assert.equal(ingredientArtwork("cooked brown rice"), "rice");
  for (const value of [
    undefined,
    null,
    3,
    "",
    "rice vinegar",
    "rice flour",
    "unlisted ingredient",
  ]) {
    assert.equal(ingredientArtwork(value), null);
  }
});
