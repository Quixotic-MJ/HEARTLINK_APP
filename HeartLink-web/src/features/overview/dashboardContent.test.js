import assert from "node:assert/strict";
import test from "node:test";
import { contentLibraryLink, dashboardContent } from "./dashboardContent.js";

const approved = { id: "a", name: "Approved recipe", status: "draft", expert_validated: true, reviewed_by: "synthetic-expert", reviewed_at: "2026-11-15T08:00:00Z", image_url: "/recipe.png" };
const waiting = { id: "w", name: "Waiting recipe", status: "draft", expert_validated: false, updated_at: "2026-11-16T08:00:00Z", image_url: "/waiting.png" };

test("dashboard follows the review-to-publication workflow", () => {
  const items = dashboardContent([waiting, approved, { ...approved, id: "b", status: "published" }, { ...waiting, id: "p", status: "published" }, { ...approved, id: "c", status: "archived" }], "recipes");
  assert.deepEqual(items.map(({ id, status, expertValidated }) => [id, status, expertValidated]), [["p", "published", false], ["w", "draft", false], ["b", "published", true]]);
  assert.equal(items[0].image, "/waiting.png");
});
test("incomplete review details stay in review instead of looking published", () => {
  const rows = [
    { ...approved, status: "published", expert_validated: false }, { ...approved, status: "published", expert_validated: "true" },
    { ...approved, status: "published", reviewed_by: "" }, { ...approved, status: "published", reviewed_by: null },
    { ...approved, status: "published", reviewed_at: null }, { ...approved, status: "published", reviewed_at: "invalid" },
    { ...approved, status: "unknown" }, { ...approved, name: " " }, { ...approved, id: null }, null,
  ];
  const items = dashboardContent(rows, "recipes");
  assert.equal(items.length, 6);
  assert.ok(items.every((item) => !item.expertValidated && item.reviewedAt === null));
});

test("workflow items sort by their relevant activity without mutating rows", () => {
  const rows = [{ ...waiting, updated_at: "2026-11-16T08:00:00Z" }, { ...approved, id: "b", status: "published", name: "New approval", reviewed_at: "2026-11-16T07:00:00Z", media_url: "/routine.png" }];
  const items = dashboardContent({ data: rows }, "exercises");
  assert.deepEqual(items.map(({ id }) => id), ["w", "b"]);
  assert.equal(items[1].image, "/routine.png");
  assert.equal(rows[0].id, "w");
  assert.equal(items[1].expertValidated, true);
});

test("invalid list envelopes fail visibly rather than imply an empty queue", () => {
  for (const response of [null, {}, { data: {} }]) assert.throws(() => dashboardContent(response, "recipes"), /Content list unavailable/);
  assert.deepEqual(dashboardContent([], "recipes"), []);
});

test("content links use the existing library search and safely encode names", () => {
  assert.equal(contentLibraryLink({ kind: "recipes", name: "Soup & rice / lunch?" }), "/foods?search=Soup%20%26%20rice%20%2F%20lunch%3F");
  assert.equal(contentLibraryLink({ kind: "exercises", name: "Seated movement" }), "/exercises?search=Seated%20movement");
});
