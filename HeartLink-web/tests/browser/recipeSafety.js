// Synthetic browser boundary: no backend/database/provider requests are allowed through.
export default async function recipeSafety(page) {
  const origin = "http://127.0.0.1:5180";
  const context = await page
    .context()
    .browser()
    .newContext({
      serviceWorkers: "block",
      reducedMotion: "reduce",
      viewport: { width: 1280, height: 900 },
    });
  try {
    const local = await context.newPage(),
      errors = [];
    let failArchive = true,
      writes = 0;
    let holdPublish = false,
      releasePublish;
    let markPublishStarted;
    const publishStarted = new Promise((resolve) => {
      markPublishStarted = resolve;
    });
    let recipe = {
      id: "synthetic-recipe",
      name: "Synthetic recipe",
      category: "Lunch",
      servings: 2,
      prep_time_minutes: 15,
      difficulty: "Easy",
      sodium_mg: 100,
      calories: 150,
      saturated_fat_g: 1,
      cholesterol_mg: 0,
      fiber_g: 2,
      ingredients: [{ name: "Synthetic beans", amount: 200, unit: "g" }],
      steps: ["Rinse and cook."],
      status: "published",
      expert_validated: true,
      updated_at: "revision-1",
    };
    local.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (url.origin !== origin) return route.abort();
      if (!url.pathname.startsWith("/api/")) return route.continue();
      if (url.pathname === "/api/auth/me")
        return route.fulfill({
          json: { user_id: "synthetic-admin", role: "admin" },
        });
      if (url.pathname === "/api/auth/refresh")
        return route.fulfill({ json: { success: true, expires_in: 3600 } });
      if (url.pathname.endsWith("/stream"))
        return route.fulfill({
          contentType: "text/event-stream",
          body: ": synthetic heartbeat\n\n",
        });
      if (url.pathname.startsWith("/api/admin/notifications"))
        return route.fulfill({
          json: { items: [], total: 0, unread_count: 0 },
        });
      if (url.pathname === "/api/recipes" && req.method() === "GET")
        return route.fulfill({ json: [recipe] });
      if (
        url.pathname === "/api/recipes/synthetic-recipe" &&
        req.method() === "PUT"
      ) {
        writes++;
        if (failArchive)
          return route.fulfill({
            status: 500,
            json: { detail: "Synthetic archive failure" },
          });
        const body = req.postDataJSON();
        if (body.expectedUpdatedAt !== recipe.updated_at)
          throw Error("Recipe status change lost its revision boundary");
        if (!["archived", "draft", "published"].includes(body.status))
          throw Error("Unexpected recipe status action");
        if (holdPublish && body.status === "published")
          await new Promise((resolve) => {
            releasePublish = resolve;
            markPublishStarted();
          });
        recipe = {
          ...recipe,
          status: body.status,
          updated_at: `revision-${writes}`,
        };
        return route.fulfill({ json: recipe });
      }
      throw Error(
        "Unexpected recipe safety request " + req.method() + " " + url.pathname,
      );
    });
    await local.goto(origin + "/foods");
    const action = async (name) => {
      await local
        .getByRole("button", {
          name: "Actions for Synthetic recipe",
          exact: true,
        })
        .click();
      await local.getByRole("menuitem", { name, exact: true }).click();
    };
    if (
      await local.getByRole("button", { name: "Delete", exact: true }).count()
    )
      throw Error(
        "Recipe library still exposes permanent deletion instead of retained history",
      );
    await action("Archive");
    const dialog = local.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Archive recipe", exact: true })
      .click();
    await dialog
      .getByRole("alert")
      .filter({ hasText: "Synthetic archive failure" })
      .waitFor({ timeout: 5000 });
    if (writes !== 1 || !(await dialog.isVisible()))
      throw Error("Failed recipe archive closed or duplicated");
    failArchive = false;
    await dialog
      .getByRole("button", { name: "Archive recipe", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    if (writes !== 2)
      throw Error("Recipe archive retry did not send one request");
    await action("Restore to draft");
    await action("Archive");
    await dialog
      .getByRole("button", { name: "Archive recipe", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    if (writes !== 4 || recipe.status !== "archived")
      throw Error("Draft cannot be archived without deletion");
    await action("Restore to draft");
    holdPublish = true;
    await action("Publish");
    const trigger = local.getByRole("button", {
      name: "Actions for Synthetic recipe",
      exact: true,
    });
    await publishStarted;
    await local.waitForFunction(() =>
      document.querySelector('.library-actions-trigger[aria-busy="true"]'),
    );
    if (
      !(await trigger.isDisabled()) ||
      (await local.getByRole("menu").count())
    )
      throw Error(
        "Pending recipe actions can reopen a conflicting lifecycle menu",
      );
    await trigger.evaluate((el) => {
      el.click();
      el.click();
    });
    if (writes !== 6 || !releasePublish)
      throw Error(
        "Pending publish was duplicated or never reached the synthetic boundary",
      );
    releasePublish();
    await local.waitForFunction(
      () =>
        !document.querySelector('.library-actions-trigger[aria-busy="true"]'),
    );
    if (writes !== 6 || recipe.status !== "published")
      throw Error("Publish did not finish exactly once");
    if (errors.length) throw Error(errors.join("; "));
    return "Recipe archive failure retains its confirmation, revision and retry; synthetic requests only";
  } finally {
    await context.close();
  }
}
