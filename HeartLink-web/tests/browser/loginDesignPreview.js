export default async function loginDesignPreview(page) {
  const origin = "http://127.0.0.1:5181";
  const context = await page.context().browser().newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const assert = (value, message) => { if (!value) throw Error(message); };
  const errors = [], external = [], api = [];
  try {
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
      if (url.pathname.startsWith("/api/")) api.push(url.pathname);
      return route.continue();
    });
    const local = await context.newPage();
    local.on("pageerror", (error) => errors.push(error.message));
    await local.goto(origin + "/__preview/login");
    await local.getByRole("heading", { name: "Welcome back.", exact: true }).waitFor();
    await local.waitForLoadState("networkidle");
    for (const input of await local.locator("input").all()) assert(await input.isDisabled(), "Preview accepts credential input");
    assert(await local.getByRole("button", { name: "Sign in", exact: true }).isDisabled(), "Preview sign-in enabled");
    assert(!/cardiologist|dietitian|physical therapist|staff portal|4 roles/i.test(await local.locator("body").innerText()), "Design preview reveals roster");
    await local.screenshot({ path: ".tmp/login-safe-preview.png" });
    await local.setViewportSize({ width: 375, height: 812 });
    assert(await local.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Preview overflows phone");
    await local.getByRole("link", { name: "Back to home", exact: true }).click();
    await local.waitForURL(origin + "/");
    // Landing mounts the real public app and may ask only the synthetic /me endpoint.
    assert(api.filter((path) => path !== "/api/auth/me").length === 0, "Login preview made an auth/write request");
    assert(errors.length === 0 && external.length === 0, "Preview browser/network failure: " + errors.join("; "));
    return { actualLoginPresentation: true, credentialInputsDisabled: true, roleRosterRemoved: true, apiWrites: 0, homeLink: true, externalRequests: 0, pageErrors: 0 };
  } finally { await context.close(); }
}
