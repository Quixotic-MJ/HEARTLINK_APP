// Synthetic archive/refresh failures only; all APIs intercepted and external origins blocked.
export default async function libraryRefresh(page) {
  const results = [];
  for (const kind of ["routine", "recipe"])
    results.push(await checkLibraryRefresh(page, kind));
  return results;
}

async function checkLibraryRefresh(page, kind) {
  const origin = "http://127.0.0.1:5180";
  const isRecipe = kind === "recipe";
  const listPath = isRecipe ? "/api/recipes" : "/api/exercises/";
  const context = await page.context().browser().newContext({
    serviceWorkers: "block",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
  });
  let releaseRefresh;
  try {
    const local = await context.newPage();
    const rows = ["Archive sample", `Keep this ${kind}`].map((name, index) => ({
      id: `synthetic-${kind}-${index}`,
      name,
      description: "Synthetic movement instructions",
      status: "draft",
      updated_at: "revision-1",
      type: "Stationary",
      duration_minutes: 1,
      steps: [{ instruction: "Synthetic movement", mode: "time", duration_seconds: 30 }],
    }));
    let archived = false, failRefresh = true, coldFailure = false, denyRead = false, heldRefresh = false, writes = 0;
    const errors = [];
    local.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (!url.pathname.startsWith("/api/")) return route.continue();
      if (url.pathname === "/api/auth/me")
        return route.fulfill({ json: { user_id: "synthetic-admin", role: "admin" } });
      if (url.pathname === "/api/auth/refresh")
        return route.fulfill({ json: { success: true, expires_in: 3600 } });
      if (url.pathname.endsWith("/stream"))
        return route.fulfill({ contentType: "text/event-stream", body: ": synthetic heartbeat\n\n" });
      if (url.pathname.includes("notifications"))
        return route.fulfill({ json: { items: [], total: 0, unread_count: 0 } });
      if (url.pathname === listPath && request.method() === "GET") {
        if (denyRead)
          return route.fulfill({ status: 403, json: { detail: "Synthetic access denied" } });
        if (coldFailure)
          return route.fulfill({ status: 503, json: { detail: "Synthetic initial load unavailable" } });
        if (archived && failRefresh) {
          if (!heldRefresh) {
            heldRefresh = true;
            await new Promise((resolve) => { releaseRefresh = resolve; });
          }
          return route.fulfill({ status: 503, json: { detail: "Synthetic refresh unavailable" } });
        }
        return route.fulfill({ json: rows });
      }
      if (url.pathname === `${listPath.replace(/\/$/, "")}/synthetic-${kind}-0` && request.method() === "PUT") {
        const body = request.postDataJSON();
        if (body.status !== "archived" || body.expectedUpdatedAt !== "revision-1" || Object.keys(body).length !== 2)
          throw Error("Archive changed content or lost revision protection");
        writes++;
        archived = true;
        rows[0] = { ...rows[0], status: "archived", updated_at: "revision-2" };
        return route.fulfill({ json: rows[0] });
      }
      throw Error(`Unexpected synthetic request ${request.method()} ${url.pathname}`);
    });
    await local.goto(origin + (isRecipe ? "/foods" : "/exercises"));
    const untouched = local.getByRole("button", { name: `Keep this ${kind}`, exact: true });
    await untouched.waitFor();
    await local.getByRole("button", { name: "Actions for Archive sample", exact: true }).click();
    await local.getByRole("menuitem", { name: "Archive", exact: true }).click();
    const dialog = local.getByRole("dialog", { name: `Archive ${kind}?`, exact: true });
    await dialog.getByRole("button", { name: `Archive ${kind}`, exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    if (!(await untouched.isVisible())) throw Error("Slow archive refresh hides unrelated routines");
    if (!(await untouched.isDisabled())) throw Error("Slow refresh permits stale preview/edit actions");
    if (!releaseRefresh) throw Error("Archive did not start the expected refresh");
    releaseRefresh();
    releaseRefresh = null;
    await local.getByRole("button", { name: "Try again", exact: true }).waitFor({ timeout: 10000 });
    if (!(await untouched.isVisible())) throw Error("A failed archive refresh hides every cached routine");
    if (!(await untouched.isDisabled()) || !(await local.getByRole("button", { name: "Actions for Archive sample", exact: true }).isDisabled()))
      throw Error("Failed refresh permits stale lifecycle actions");
    await local.getByRole("button", { name: "List view", exact: true }).click();
    if (!(await untouched.isVisible())) throw Error("Failed refresh hides cached list rows");
    await local.setViewportSize({ width: 375, height: 812 });
    if (await local.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw Error("Retained-content warning overflows the phone viewport");
    await local.screenshot({ path: `.tmp/${kind}-refresh-failure.png` });
    failRefresh = false;
    denyRead = true;
    await local.getByRole("button", { name: "Try again", exact: true }).click();
    await local.getByText(`Couldn't load the ${kind} library`, { exact: true }).waitFor();
    if (await untouched.count()) throw Error("Access denial exposes previously cached catalogue rows");
    denyRead = false;
    await local.getByRole("button", { name: "Try again", exact: true }).click();
    await untouched.waitFor();
    await local.getByRole("button", { name: "Actions for Archive sample", exact: true }).click();
    await local.getByRole("menuitem", { name: "Restore to draft", exact: true }).waitFor();
    await local.keyboard.press("Escape");
    coldFailure = true;
    await local.reload();
    await local.getByRole("button", { name: "Try again", exact: true }).waitFor();
    await local.getByText(`Couldn't load the ${kind} library`, { exact: true }).waitFor();
    if (await untouched.count()) throw Error("An initial failed load presents stale fixture rows");
    coldFailure = false;
    await local.getByRole("button", { name: "Try again", exact: true }).click();
    await untouched.waitFor();
    if (writes !== 1 || errors.length) throw Error("Refresh retried the mutation or crashed");
    return `${kind}: one archive, slow/503 refresh retains grid/list content with stale actions blocked;403 hides cached rows, retry reconciles status, initial-load failure remains explicit; no duplicate write`;
  } finally {
    releaseRefresh?.();
    await context.close();
  }
}
