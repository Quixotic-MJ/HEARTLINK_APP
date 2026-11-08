// Fully intercepted synthetic upload/save checks; no real account or media store.
export default async function recipeMedia(page) {
  const origin = "http://127.0.0.1:5180",
    context = await page
      .context()
      .browser()
      .newContext({
        serviceWorkers: "block",
        reducedMotion: "reduce",
        viewport: { width: 1280, height: 900 },
      });
  try {
    const local = await context.newPage(),
      errors = [],
      writes = [];
    let releaseUpload,
      releaseSave,
      uploadStarted = false,
      uploadMode = "delayed",
      failSave = true;
    const recipe = {
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
      status: "draft",
      expert_validated: false,
      updated_at: "revision-1",
    };
    local.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/static/synthetic-upload.png")
        return route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
        });
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
      if (url.pathname === "/api/upload/") {
        uploadStarted = true;
        if (uploadMode === "delayed")
          await new Promise((resolve) => {
            releaseUpload = resolve;
          });
        return route.fulfill({
          json:
            uploadMode === "malformed"
              ? {}
              : { url: "/static/synthetic-upload.png" },
        });
      }
      if (
        url.pathname === "/api/recipes/synthetic-recipe" &&
        req.method() === "PUT"
      ) {
        writes.push(req.postDataJSON());
        if (failSave) {
          await new Promise((resolve) => {
            releaseSave = resolve;
          });
          return route.fulfill({
            status: 409,
            json: { detail: "Synthetic recipe conflict" },
          });
        }
        return route.fulfill({ json: { ...recipe, updated_at: "revision-2" } });
      }
      throw Error("Unexpected recipe media request " + url.pathname);
    });
    await local.goto(origin + "/foods");
    await local
      .getByRole("button", { name: "Synthetic recipe", exact: true })
      .click();
    const dialog = local.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Edit details", exact: true })
      .click();
    await dialog.getByRole("tab", { name: "Picture", exact: true }).click();
    const file = {
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: globalThis.Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jcXkAAAAASUVORK5CYII=",
        "base64",
      ),
    };
    await dialog
      .getByLabel("Dish photograph", { exact: true })
      .setInputFiles(file);
    await local.waitForFunction(
      () =>
        document.querySelector('[role="dialog"]')?.getAttribute("aria-busy") ===
        "true",
      null,
      { timeout: 3000 },
    );
    if (
      !uploadStarted ||
      !(await dialog
        .getByRole("button", { name: "Uploading…", exact: true })
        .isDisabled())
    )
      throw Error("Recipe can save before its image upload is confirmed");
    await local.keyboard.press("Escape");
    if (!(await dialog.isVisible()) || writes.length)
      throw Error("Recipe closed or saved during upload");
    releaseUpload();
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .waitFor();
    uploadMode = "malformed";
    await dialog
      .getByLabel("Dish photograph", { exact: true })
      .setInputFiles(file);
    await dialog
      .getByRole("alert")
      .filter({ hasText: "The image upload was not confirmed" })
      .waitFor({ timeout: 5000 });
    if (
      (await dialog
        .getByRole("img", { name: "Recipe preview", exact: true })
        .getAttribute("src")) !== "/static/synthetic-upload.png"
    )
      throw Error("Unconfirmed upload erased the previous confirmed image");
    await dialog.getByRole("tab", { name: "Basics", exact: true }).click();
    await dialog
      .getByLabel("Food / meal name", { exact: true })
      .fill("Synthetic revised recipe");
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .evaluate((button) => {
        button.click();
        button.click();
      });
    await local.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (b) => b.disabled && b.textContent.includes("Saving"),
      ),
    );
    if (writes.length !== 1)
      throw Error("Rapid recipe save duplicated a mutation");
    await local.keyboard.press("Escape");
    if (!(await dialog.isVisible())) throw Error("Recipe closed during save");
    releaseSave();
    await dialog
      .getByRole("alert")
      .filter({ hasText: "Synthetic recipe conflict" })
      .waitFor();
    if (
      (await dialog
        .getByLabel("Food / meal name", { exact: true })
        .inputValue()) !== "Synthetic revised recipe"
    )
      throw Error("Failed save erased the recipe draft");
    if (
      writes[0].mediaUrl !== "/static/synthetic-upload.png" ||
      writes[0].expectedUpdatedAt !== "revision-1"
    )
      throw Error("Recipe lost its confirmed image or revision");
    failSave = false;
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    if (writes.length !== 2) throw Error("Recipe retry duplicated a request");
    if (errors.length) throw Error(errors.join("; "));
    return "Recipe upload/save locks, one rapid mutation, failed draft retention and revision/image retry passed";
  } finally {
    await context.close();
  }
}
