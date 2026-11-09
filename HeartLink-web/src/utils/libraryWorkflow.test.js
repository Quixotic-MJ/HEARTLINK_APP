import test from "node:test";
import assert from "node:assert/strict";
import {
  libraryWorkflowCounts,
  matchesLibraryWorkflow,
} from "./libraryWorkflow.js";

test("library workflow: waiting for approval, approved, published and archived, without hiding unknown history", () => {
  const items = [
    { status: "draft", expertValidated: false },
    { status: "draft", expertValidated: true },
    { status: "published", expertValidated: true },
    { status: "published", expertValidated: false },
    { status: "archived", expertValidated: true },
    { status: "legacy", expertValidated: true },
  ];
  assert.deepEqual(libraryWorkflowCounts(items), {
    all: 6,
    draft: 2,
    approved: 1,
    published: 1,
    archived: 1,
  });
  for (const item of items) {
    const buckets = ["draft", "approved", "published", "archived"].filter(
      (key) => matchesLibraryWorkflow(item, key),
    );
    assert.equal(buckets.length, item.status === "legacy" ? 0 : 1);
    assert.equal(matchesLibraryWorkflow(item, "all"), true);
  }
  assert.deepEqual(libraryWorkflowCounts([]), {
    all: 0,
    draft: 0,
    approved: 0,
    published: 0,
    archived: 0,
  });
});
