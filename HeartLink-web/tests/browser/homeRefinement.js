// Synthetic frontend-only checks; every API is intercepted and external origins are denied.
export default async function homeRefinement(page) {
  const origin = "http://127.0.0.1:5180";
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const results = [];
  const states = { total: 12, draft: 3, awaiting_review: 2, changes_requested: 1, approval_recorded: 5, published: 4, archived: 1, unknown_status: 1, published_without_review: 1 };
  const overview = { accounts: { consumers: 24, staff: 4, active: 23, disabled: 2, archived: 2, unknown_status: 1, unknown_role: 1 }, content: { recipes: states, exercises: { ...states, total: 8 } }, generated_at: "2026-11-09T00:00:00Z" };
  const viewports = [{ width: 375, height: 812 }, { width: 812, height: 375 }, { width: 1440, height: 1000 }];

  for (const [role, specialty, home] of [["admin", null, "/dashboard"], ["medical_expert", "Dietitian", "/foods"], ["medical_expert", "Physical Therapist", "/exercises"], ["medical_expert", "Cardiologist", "/notifications"]]) {
    const context = await page.context().browser().newContext({ serviceWorkers: "block", reducedMotion: "reduce", timezoneId: "America/Los_Angeles", viewport: { width: 1440, height: 1000 } });
    const issues = [], requests = [];
    let mode = "loaded", release;
    let gate = role === "admin" ? new Promise((resolve) => { release = resolve; }) : null;
    try {
      const local = await context.newPage();
      local.on("pageerror", (error) => issues.push(error.message));
      await local.clock.install({ time: new Date("2026-11-08T16:00:00Z") });
      await context.route("**/*", async (route) => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== origin) { issues.push(`External request: ${url.origin}`); return route.abort(); }
        if (!url.pathname.startsWith("/api/")) return route.continue();
        requests.push(`${req.method()} ${url.pathname}`);
        if (url.pathname === "/api/auth/me") return route.fulfill({ json: { user_id: "synthetic-staff", role, expert_type: specialty, first_name: "Synthetic", last_name: "Staff", email: "synthetic.staff@example.test", account_status: "active" } });
        if (url.pathname === "/api/auth/refresh") return route.fulfill({ json: { success: true, expires_in: 3600 } });
        if (req.method() !== "GET") { issues.push(`Unexpected write: ${req.method()} ${url.pathname}`); return route.fulfill({ status: 500, json: { detail: "Unexpected synthetic write" } }); }
        if (url.pathname === "/api/admin/notifications/stream") return route.fulfill({ contentType: "text/event-stream", body: ": synthetic heartbeat\n\n" });
        if (url.pathname === "/api/admin/notifications") return route.fulfill({ json: { items: [], total: 0, unread_count: 0 } });
        if (role === "admin" && url.pathname === "/api/admin/dashboard") {
          if (gate) await gate;
          if (mode === "error") return route.fulfill({ status: 503, json: { detail: "Synthetic overview unavailable" } });
          const data = mode === "zero" ? { ...overview, accounts: Object.fromEntries(Object.keys(overview.accounts).map((key) => [key, 0])), content: { recipes: Object.fromEntries(Object.keys(states).map((key) => [key, 0])), exercises: Object.fromEntries(Object.keys(states).map((key) => [key, 0])) } } : mode === "partial" ? { ...overview, accounts: { ...overview.accounts, active: null } } : overview;
          return route.fulfill({ json: data });
        }
        if (specialty === "Dietitian" && url.pathname === "/api/recipes") return route.fulfill({ json: [] });
        if (specialty === "Physical Therapist" && url.pathname === "/api/exercises/") return route.fulfill({ json: [] });
        issues.push(`Unexpected API: ${req.method()} ${url.pathname}`);
        return route.fulfill({ status: 500, json: { detail: "Unexpected synthetic API" } });
      });

      await local.goto(origin + home);
      const main = local.getByRole("main");
      if (role === "admin") {
        await main.getByRole("status", { name: "Loading account and content statuses", exact: true }).waitFor();
        assert(await main.locator(".skeleton").count() === 3, "Overview initial load lacks structural skeletons");
        release(); gate = null;
        await main.getByRole("heading", { name: "Recipes and exercises", exact: true }).waitFor();
        await main.getByText("24", { exact: true }).first().waitFor();
        assert(await main.getByText(/Sample data|Design preview/).count() === 0, "The overview shows made-up sample data");
        assert(await main.getByText(/isn't approved yet/).count() === 2, "Published but unapproved recipes and exercises aren't flagged");
        assert(await main.getByRole("rowheader", { name: "Total", exact: true }).count() === 1, "The status table has no total");
      } else {
        await main.getByRole("heading", { name: "Welcome back, Synthetic.", exact: true }).waitFor();
        assert(await main.locator(".score-design-preview").count() === 0, "Expert receives an Admin score preview");
      }
      await local.waitForLoadState("networkidle");
      const calendar = main.getByRole("region", { name: "Calendar", exact: true });
      await calendar.getByRole("table", { name: "November 2026", exact: true }).waitFor();
      assert(await calendar.locator("time").count() === 30, "Calendar has incorrect November dates");
      assert(await calendar.locator('time[aria-current="date"]').getAttribute("datetime") === "2026-11-09", "Calendar uses browser timezone instead of Manila");
      assert(await calendar.locator("td button").count() === 0, "Date-only cells falsely imply scheduling");
      await calendar.getByRole("button", { name: "Next month", exact: true }).focus();
      await local.keyboard.press("Enter");
      await calendar.getByRole("table", { name: "December 2026", exact: true }).waitFor();
      await local.keyboard.press("Enter");
      await calendar.getByRole("table", { name: "January 2027", exact: true }).waitFor();
      await calendar.getByRole("button", { name: "Previous month", exact: true }).click();
      await calendar.getByRole("table", { name: "December 2026", exact: true }).waitFor();
      await calendar.getByRole("button", { name: "Today", exact: true }).click();
      await calendar.getByRole("table", { name: "November 2026", exact: true }).waitFor();
      assert(await main.locator(".portal-page-enter").evaluate((el) => getComputedStyle(el).animationDuration) === "0s", "Reduced-motion route entrance still animates");
      await local.emulateMedia({ reducedMotion: "no-preference" });
      assert(await main.locator(".portal-page-enter").evaluate((el) => {
        const style = getComputedStyle(el);
        return style.animationDuration === "0.14s" && style.animationDelay === "0s" && style.transform === "none";
      }), "Route entrance adds a delay or a transformed dialog ancestor");
      await local.emulateMedia({ reducedMotion: "reduce" });
      for (const viewport of viewports) {
        await local.setViewportSize(viewport);
        assert(!await local.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${specialty || role} home overflows at ${viewport.width}`);
        const calendarBox = await calendar.boundingBox();
        assert(calendarBox && calendarBox.width <= viewport.width && calendarBox.x >= 0, "Calendar exceeds its viewport");
        if (viewport.width !== 812) await local.screenshot({ path: `.tmp/home-${specialty || role}-${viewport.width}.png` });
      }
      if (role === "admin") {
        await local.setViewportSize({ width: 1440, height: 1000 });
        gate = new Promise((resolve) => { release = resolve; });
        await main.getByRole("button", { name: "Refresh", exact: true }).click();
        await main.getByRole("status").filter({ hasText: "Updating overview" }).waitFor();
        assert(await main.getByRole("heading", { name: "Recipes and exercises", exact: true }).isVisible(), "Background refresh clears saved counts");
        assert(await main.locator(".skeleton").count() === 0, "Background refresh shows first-load skeletons");
        release(); gate = null;
        await main.getByRole("button", { name: "Refresh", exact: true }).waitFor();
        mode = "error";
        await local.reload();
        await main.getByRole("alert").waitFor();
        assert(await main.locator(".home-snapshot").count() === 0, "Error is misrepresented as actual zero counts");
        mode = "zero";
        await main.getByRole("button", { name: "Try again", exact: true }).click();
        await main.getByRole("heading", { name: "Recipes and exercises", exact: true }).waitFor();
        assert((await main.locator(".home-snapshot dd").allTextContents()).every((value) => value === "0"), "Actual zero counts are not retained");
        mode = "partial";
        await local.reload();
        await main.locator(".home-account-states").getByText("Unknown", { exact: true }).waitFor();
        await local.goto(origin + "/analytics");
        await main.getByRole("heading", { name: "Analytics & reporting", exact: true }).waitFor();
        assert(await main.getByText(/Sample data|Design preview/).count() === 0, "Analytics shows made-up sample data");
      } else {
        await local.goto(origin + "/dashboard");
        await local.waitForURL(origin + home);
        await local.goto(origin + "/analytics");
        await local.waitForURL(origin + home);
        await local.goto(origin + "/settings");
        await main.getByRole("heading", { name: "Account settings", exact: true }).waitFor();
        assert(await main.locator(".workspace-calendar").count() === 0, "Expert calendar leaks onto a non-home page");
        assert(!requests.some((request) => /dashboard|analytics|users|activity|health|hss/.test(request)), "Expert made a forbidden aggregate or health request");
      }
      assert(issues.length === 0, issues.join("; "));
      results.push(`${specialty || role}: calendar, role/network boundaries, responsive/reduced-motion${role === "admin" ? ", load/error/zero/unknown and sample previews" : ""}`);
    } finally { release?.(); await context.close(); }
  }

  const context = await page.context().browser().newContext({ serviceWorkers: "block", reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  try {
    const local = await context.newPage(), issues = [];
    local.on("pageerror", (error) => issues.push(error.message));
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { issues.push(`External landing request: ${url.origin}`); return route.abort(); }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      if (url.pathname === "/api/auth/me") return route.fulfill({ status: 401, json: { detail: "Synthetic guest" } });
      if (url.pathname === "/api/auth/refresh") return route.fulfill({ status: 401, json: { detail: "Synthetic guest" } });
      issues.push(`Unexpected landing API: ${url.pathname}`);
      return route.fulfill({ status: 500, json: { detail: "Unexpected synthetic API" } });
    });
    await local.goto(origin);
    await local.getByRole("heading", { level: 1, name: /Know your numbers/ }).waitFor();
    await local.waitForLoadState("networkidle");
    const hero = await local.locator(".landing-hero-copy").boundingBox();
    assert(hero && Math.abs(hero.x + hero.width / 2 - 720) < 2, "Landing hero is not centered");
    await local.getByRole("button", { name: "Move more regularly", exact: true }).click();
    await local.getByRole("heading", { name: "Know what the routine asks of you", exact: true }).waitFor();
    const faq = local.locator("details").first();
    await faq.locator("summary").focus(); await local.keyboard.press("Enter");
    assert(await faq.getAttribute("open") !== null, "FAQ does not open from the keyboard");
    await local.keyboard.press("Enter");
    await local.getByText("Android download not yet available", { exact: true }).waitFor();
    assert(await local.getByRole("link", { name: "Open Android download", exact: true }).count() === 0, "Unconfigured Android URL becomes a download link");
    assert(await local.getByRole("link", { name: /get started|free|demo/i }).count() === 0, "Landing advertises an invented sign-up or private demo");
    for (const viewport of viewports) {
      await local.setViewportSize(viewport);
      await local.evaluate(() => window.scrollTo(0, 0));
      assert(!await local.evaluate(() => document.documentElement.scrollWidth > innerWidth), "Landing overflows");
      if (viewport.width !== 812) await local.screenshot({ path: `.tmp/landing-centered-${viewport.width}.png` });
    }
    await local.setViewportSize({ width: 375, height: 812 });
    const menu = local.getByRole("button", { name: "Open navigation", exact: true });
    await menu.focus(); await local.keyboard.press("Enter");
    await local.getByRole("navigation", { name: "Mobile navigation", exact: true }).waitFor();
    await local.keyboard.press("Escape");
    assert(await menu.evaluate((el) => el === document.activeElement), "Landing menu Escape loses trigger focus");
    await menu.click();
    await local.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link", { name: "Questions", exact: true }).click();
    assert(await local.getByRole("navigation", { name: "Mobile navigation", exact: true }).count() === 0, "Landing menu stays open after navigation");
    assert(issues.length === 0, issues.join("; "));
    results.push("Landing: centered hero, preview, keyboard FAQ/menu, unavailable APK, responsive layout");
  } finally { await context.close(); }
  return results;
}
