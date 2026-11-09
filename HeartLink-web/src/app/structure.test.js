import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PAGE_ACCESS } from "./access.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
const modules = walk(root).filter((path) => /\.(?:js|jsx|css)$/.test(path));
const imports = (path) =>
  [
    ...readFileSync(path, "utf8").matchAll(
      /(?:\bfrom\s+|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g,
    ),
  ].map((match) => resolve(dirname(path), match[1]));

test("all source filenames are camelCase and relative imports use exact on-disk casing", () => {
  for (const path of modules) {
    const parts = relative(root, path).split(sep);
    assert.match(
      parts.pop(),
      /^[a-z][A-Za-z0-9]*(?:\.test)?\.(?:js|jsx|css)$/,
      path,
    );
    for (const part of parts) assert.match(part, /^[a-z][A-Za-z0-9]*$/, path);
    for (const target of imports(path)) {
      assert.equal(relative(root, target).startsWith(".."), false, path);
      let dir = root;
      for (const part of relative(root, target).split(sep)) {
        assert.ok(
          readdirSync(dir).includes(part),
          `${path}: missing or incorrectly cased ${target}`,
        );
        dir = resolve(dir, part);
      }
    }
  }
});

test("the browser entry stays connected without importing retired clinical screens or tests", () => {
  const seen = new Set();
  const visit = (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    assert.equal(
      relative(root, path).split(sep).includes("legacy"),
      false,
      path,
    );
    assert.equal(path.endsWith(".test.js"), false, path);
    for (const target of imports(path)) visit(target);
  };
  const html = readFileSync(
    new URL("../../index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /src="(?:\.\/|\/)src\/app\/main\.jsx"/);
  visit(resolve(root, "app/main.jsx"));
  const app = readFileSync(new URL("./app.jsx", import.meta.url), "utf8");
  for (const route of Object.keys(PAGE_ACCESS))
    assert.ok(app.includes(`path="${route}"`), route);
});
