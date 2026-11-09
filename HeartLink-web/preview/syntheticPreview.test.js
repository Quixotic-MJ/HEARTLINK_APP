import test from "node:test";
import assert from "node:assert/strict";
import { syntheticMiddleware, syntheticPreviewPlugin, origin } from "./syntheticPreview.js";
import { roles } from "./syntheticFixtures.js";
import config from "../vite.syntheticPreview.config.js";

function request(path, { role, method = "GET", headers = {} } = {}) {
  const response = { headers: {}, statusCode: 200, setHeader(name, value) { this.headers[name] = value; }, end(body) { this.body = body; } };
  const req = { url: path, method, headers: { host: "127.0.0.1:5181", ...(role ? { cookie: `heartlink_synthetic_role=${role}` } : {}), ...headers } };
  syntheticMiddleware(req, response, () => { response.fellThrough = true; });
  return response;
}

test("chooser replaces credential forms and validates demo role selection", () => {
  const chooser = request("/__preview");
  assert.equal(chooser.statusCode, 200);
  assert.equal(chooser.headers["Referrer-Policy"], "same-origin");
  assert.match(chooser.body, /no email, password or real account needed/);
  assert.doesNotMatch(chooser.body, /<input/);
  assert.equal(request("/login").headers.Location, "/__preview");
  for (const [role, entry] of Object.entries(roles)) {
    const selected = request(`/__preview/session?role=${role}`, { method: "POST", headers: { origin } });
    assert.equal(selected.headers.Location, entry.home);
    assert.match(selected.headers["Set-Cookie"], /HttpOnly; SameSite=Strict/);
  }
  assert.equal(request("/__preview/session?role=admin", { method: "POST" }).statusCode, 400);
  assert.equal(request("/__preview/session?role=__proto__", { method: "POST", headers: { origin } }).statusCode, 400);
});

test("API fails closed without a synthetic session, even if real-looking cookies exist", () => {
  for (const role of [undefined, "__proto__", "unknown"]) {
    assert.equal(request("/api/auth/me", { role }).statusCode, 401);
  }
  assert.equal(request("/api/auth/me", { headers: { cookie: "session=ignored; access_token=ignored" } }).statusCode, 401);
  assert.equal(request("/api/auth/web-login", { method: "POST" }).statusCode, 401);
});

test("four synthetic identities retain recipe/routine/Admin API scopes", () => {
  for (const role of Object.keys(roles)) {
    const me = JSON.parse(request("/api/auth/me", { role }).body);
    assert.equal(me.user_id, `synthetic-${role}`);
    assert.equal(me.role, roles[role].role);
    assert.equal(me.expert_type, roles[role].expert_type);
    assert.equal(request("/api/recipes", { role }).statusCode, ["admin", "dietitian"].includes(role) ? 200 : 403);
    assert.equal(request("/api/exercises/", { role }).statusCode, ["admin", "therapist"].includes(role) ? 200 : 403);
    assert.equal(request("/api/admin/dashboard", { role }).statusCode, role === "admin" ? 200 : 403);
    assert.equal(request("/api/admin/notifications", { role }).statusCode, 200);
  }
});

test("mutations never save; refresh/logout touch only the synthetic session", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    for (const path of ["/api/recipes", "/api/exercises/synthetic-routine-0", "/api/admin/users/synthetic/plan", "/api/upload/", "/api/auth/web-login"]) {
      const res = request(path, { role: "admin", method });
      assert.equal(res.statusCode, 403);
      assert.match(res.body, /Nothing was saved or sent/);
    }
  }
  assert.equal(request("/api/auth/refresh", { role: "admin", method: "POST" }).statusCode, 200);
  assert.match(request("/api/auth/logout", { method: "POST" }).headers["Set-Cookie"], /^heartlink_synthetic_role=; Max-Age=0;/);
  assert.equal(request("/api/admin/unknown", { role: "admin" }).statusCode, 501);
  assert.equal(request("/api/owner/profile", { role: "admin" }).statusCode, 501);
  assert.equal(request("/api/admin/activity/export", { role: "admin" }).statusCode, 501);
});

test("local-only host/origin guards and media boundaries", () => {
  for (const headers of [{ host: "attacker.example:5181" }, { host: "localhost:5181" }, { origin: "https://attacker.example" }]) {
    assert.equal(request("/api/auth/me", { role: "admin", headers }).statusCode, 403);
  }
  assert.equal(request("/static/anything").statusCode, 404);
  assert.equal(request("/__preview/media/recipe-0.svg").statusCode, 200);
  assert.equal(request("/__preview/media/exercise-0.svg").statusCode, 200);
  assert.equal(request("/__preview/media/recipe-999.svg").statusCode, 404);
  assert.equal(request("/__preview/login").fellThrough, true);
  assert.equal(request("/__preview/login", { method: "POST" }).statusCode, 404);
  assert.match(request("/__preview").headers["Content-Security-Policy"], /form-action 'self'; frame-src 'none'/);
  assert.equal(request("/src/app/main.jsx").fellThrough, true);
});

test("preview plugin refuses builds, public hosting, proxying and port fallback", () => {
  const plugin = syntheticPreviewPlugin();
  const safe = { command: "serve", isPreview: false, server: { host: "127.0.0.1", port: 5181, strictPort: true } };
  assert.doesNotThrow(() => plugin.configResolved(safe));
  for (const config of [
    { ...safe, command: "build" }, { ...safe, isPreview: true },
    ...[{ host: "0.0.0.0" }, { port: 5173 }, { strictPort: false }, { proxy: {} }, { https: {} }].map((server) => ({ ...safe, server: { ...safe.server, ...server } })),
  ]) assert.throws(() => plugin.configResolved(config), /Synthetic preview requires/);
});

test("standalone config disables environment files, client env exposure and backend proxy", () => {
  assert.equal(config.envDir, false);
  assert.deepEqual(config.envPrefix, []);
  assert.equal(config.define["import.meta.env.VITE_API_URL"], '""');
  assert.equal(config.define["import.meta.env.VITE_APK_URL"], '""');
  assert.equal(config.server.proxy, undefined);
  assert.equal(config.server.host, "127.0.0.1");
  assert.match(config.cacheDir.replaceAll("\\", "/"), /\/\.tmp\/synthetic-vite-cache$/);
});
