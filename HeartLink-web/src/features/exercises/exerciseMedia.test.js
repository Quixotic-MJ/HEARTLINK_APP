import test from "node:test";
import assert from "node:assert/strict";
import { isRoutineVideo, resolveRoutineMediaUrl } from "./exerciseMedia.js";

test("routine media resolves legacy relative uploads and safe image/video URLs", () => {
  assert.equal(
    resolveRoutineMediaUrl("static/cover.png", "https://api.example.test/"),
    "https://api.example.test/static/cover.png",
  );
  assert.equal(
    resolveRoutineMediaUrl("/static/cover.png"),
    "/static/cover.png",
  );
  assert.equal(
    resolveRoutineMediaUrl(" https://media.example.test/cover.png "),
    "https://media.example.test/cover.png",
  );
  assert.equal(
    resolveRoutineMediaUrl("data:image/png;base64,c3ludGhldGlj"),
    "data:image/png;base64,c3ludGhldGlj",
  );
  for (const value of [
    null,
    {},
    "",
    "javascript:alert(1)",
    "data:text/html,synthetic",
    "//example.test/cover",
    "\\\\example.test/cover",
    "https://synthetic:secret@example.test/image",
  ])
    assert.equal(resolveRoutineMediaUrl(value), "");
});

test("routine videos support uploaded formats and query strings without treating a linked player as an image", () => {
  for (const url of [
    "/static/clip.mp4",
    "/static/clip.WEBM?revision=1",
    "https://media.example.test/clip.mov#start",
    "data:video/mp4;base64,c3ludGhldGlj",
  ])
    assert.equal(isRoutineVideo(url), true);
  for (const url of [
    null,
    "/static/photo.jpg",
    "https://www.youtube.com/watch?v=synthetic",
    "/photo.png?caption=clip.mp4",
  ])
    assert.equal(isRoutineVideo(url), false);
});
