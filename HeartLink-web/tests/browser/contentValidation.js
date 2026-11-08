// Public editor validation behavior with synthetic, fully intercepted APIs only.
export default async function contentValidation(page) {
  const origin = "http://127.0.0.1:5180",
    context = await page
      .context()
      .browser()
      .newContext({
        serviceWorkers: "block",
        reducedMotion: "reduce",
        viewport: { width: 375, height: 812 },
      });
  try {
    const local = await context.newPage();
    let writes = 0;
    await context.route("**/*", (route) => {
      const request = route.request(),
        url = new URL(request.url());
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
      if (request.method() !== "GET") writes++;
      return route.fulfill({ json: [] });
    });
    await local.goto(origin + "/foods");
    await local
      .getByRole("button", { name: "Add recipe", exact: true })
      .click();
    const dialog = local.getByRole("dialog");
    const checkTabs = async (second, last) => {
      const basics = dialog.getByRole("tab", { name: "Basics", exact: true });
      await basics.focus();
      for (const [key, label] of [
        ["ArrowRight", second],
        ["End", last],
        ["ArrowRight", "Basics"],
        ["ArrowLeft", last],
        ["Home", "Basics"],
      ]) {
        await local.keyboard.press(key);
        const tab = dialog.getByRole("tab", { name: label, exact: true });
        if (
          (await tab.getAttribute("aria-selected")) !== "true" ||
          !(await tab.evaluate((el) => el === document.activeElement))
        )
          throw Error(`Editor ${key} did not select and focus ${label}`);
        const panelId = await tab.getAttribute("aria-controls");
        const panel = dialog.getByRole("tabpanel", {
          name: label,
          exact: true,
        });
        if (!panelId || (await panel.getAttribute("id")) !== panelId)
          throw Error("Tab does not label/control its active panel");
        if ((await dialog.locator('[role="tab"][tabindex="0"]').count()) !== 1)
          throw Error("Editor tabs lack a single keyboard entry point");
      }
      await local.keyboard.press("Tab");
      if (
        !(await dialog
          .getByRole("tabpanel", { name: "Basics", exact: true })
          .evaluate((el) => el === document.activeElement))
      )
        throw Error("Tab did not enter the active form panel");
    };
    await checkTabs("Nutrition", "Picture");
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    const summary = dialog.getByRole("alert", {
      name: "There is a problem",
      exact: true,
    });
    await summary.waitFor({ timeout: 5000 });
    await local.waitForFunction(
      () =>
        document.querySelector("[data-validation-summary]") ===
        document.activeElement,
      null,
      { timeout: 3000 },
    );
    await summary
      .getByRole("link", {
        name: "Ingredient 1 name: Ingredient name is required.",
        exact: true,
      })
      .click();
    const ingredient = dialog.getByLabel("Ingredient 1 name", { exact: true });
    if ((await ingredient.boundingBox()).width < 150)
      throw Error("Ingredient name is too narrow to edit on a phone");
    if (!(await ingredient.evaluate((el) => el === document.activeElement)))
      throw Error("Recipe summary did not open and focus the ingredient field");
    if ((await ingredient.getAttribute("aria-invalid")) !== "true")
      throw Error("Recipe field error is not exposed");
    const described = await ingredient.getAttribute("aria-describedby");
    if (
      !described ||
      !(await local.locator('[id="' + described + '"]').count())
    )
      throw Error("Ingredient inline error is not associated");
    await summary
      .getByRole("link", {
        name: "Cooking step 1: Step content is required.",
        exact: true,
      })
      .click();
    if (
      !(await dialog
        .getByLabel("Cooking step 1", { exact: true })
        .evaluate((el) => el === document.activeElement))
    )
      throw Error("Recipe summary did not focus its cooking step");
    if (await dialog.evaluate((el) => el.scrollWidth > el.clientWidth))
      throw Error("Recipe errors overflow the phone dialog");
    await dialog
      .getByRole("button", { name: "Remove ingredient", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Delete step", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await summary
      .getByRole("link", {
        name: "Ingredients: At least one ingredient is required.",
        exact: true,
      })
      .click();
    if (
      !(await dialog
        .getByRole("heading", { name: "Ingredients", exact: true })
        .evaluate((el) => el === document.activeElement))
    )
      throw Error("Recipe empty-list error did not focus its section");
    if (writes) throw Error("Invalid form reached a write endpoint");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await local.goto(origin + "/exercises");
    await local
      .getByRole("button", { name: "Create routine", exact: true })
      .click();
    await checkTabs("Steps", "Media");
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await summary.waitFor({ timeout: 5000 });
    await local.waitForFunction(
      () =>
        document.querySelector("[data-validation-summary]") ===
        document.activeElement,
      null,
      { timeout: 3000 },
    );
    await summary
      .getByRole("link", {
        name: "Main part instruction 1: Instruction cannot be empty",
        exact: true,
      })
      .click();
    const instruction = dialog.getByLabel("Main part instruction 1", {
      exact: true,
    });
    if (!(await instruction.evaluate((el) => el === document.activeElement)))
      throw Error("Routine summary did not open and focus the step");
    if ((await instruction.getAttribute("aria-invalid")) !== "true")
      throw Error("Routine instruction error is not exposed");
    await instruction.fill("Synthetic step draft");
    await dialog.getByLabel("Main part seconds 1", { exact: true }).fill("60");
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await local.waitForFunction(
      () =>
        document.querySelector("[data-validation-summary]") ===
        document.activeElement,
      null,
      { timeout: 3000 },
    );
    await summary
      .getByRole("link", {
        name: "Main part seconds 1: Use 0 to 59 seconds",
        exact: true,
      })
      .click();
    const seconds = dialog.getByLabel("Main part seconds 1", { exact: true });
    if (!(await seconds.evaluate((el) => el === document.activeElement)))
      throw Error("Routine time error was not focused");
    if ((await instruction.inputValue()) !== "Synthetic step draft")
      throw Error("Validation lost the routine draft");
    if ((await seconds.getAttribute("aria-invalid")) !== "true")
      throw Error("Routine time error is not exposed");
    await dialog
      .getByLabel("Main part timing mode 1", { exact: true })
      .selectOption("count");
    await dialog
      .getByLabel("Main part repetitions 1", { exact: true })
      .fill("0");
    await dialog
      .getByLabel("Main part seconds per repetition 1", { exact: true })
      .fill("0");
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await summary
      .getByRole("link", {
        name: "Main part repetitions 1: Set the reviewed count",
        exact: true,
      })
      .waitFor({ timeout: 5000 });
    if (
      await summary
        .getByRole("link", {
          name: "Main part seconds 1: Use 0 to 59 seconds",
          exact: true,
        })
        .count()
    )
      throw Error(
        "Summary links to an inactive time field hidden by count mode",
      );
    await summary
      .getByRole("link", {
        name: "Main part seconds per repetition 1: Set the reviewed pace",
        exact: true,
      })
      .click();
    if (
      !(await dialog
        .getByLabel("Main part seconds per repetition 1", { exact: true })
        .evaluate((el) => el === document.activeElement))
    )
      throw Error("Routine count pace error was not focused");
    await summary
      .getByRole("link", {
        name: "Description: Description is required.",
        exact: true,
      })
      .click();
    if (
      !(await dialog
        .getByLabel("Description", { exact: true })
        .evaluate((el) => el === document.activeElement))
    )
      throw Error("Routine summary did not open the basics tab");
    if (await dialog.evaluate((el) => el.scrollWidth > el.clientWidth))
      throw Error("Routine errors overflow the phone dialog");
    await dialog.getByRole("tab", { name: "Media", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Add guide image", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await summary
      .getByRole("link", {
        name: "Extra picture 1 URL: URL cannot be empty",
        exact: true,
      })
      .click();
    const guide = dialog.getByLabel("Extra picture 1 URL", { exact: true });
    if (!(await guide.evaluate((el) => el === document.activeElement)))
      throw Error("Routine guide URL error did not receive focus");
    if ((await guide.boundingBox()).width < 120)
      throw Error("Guide image URL is too narrow to edit on a phone");
    const guideError = await guide.getAttribute("aria-describedby");
    if (
      !guideError ||
      !(await local.locator('[id="' + guideError + '"]').count())
    )
      throw Error("Guide URL inline error is not associated");
    await local.setViewportSize({ width: 812, height: 375 });
    if (await dialog.evaluate((el) => el.scrollWidth > el.clientWidth))
      throw Error("Routine validation overflows in phone landscape");
    await local.setViewportSize({ width: 1440, height: 900 });
    if (await dialog.evaluate((el) => el.scrollWidth > el.clientWidth))
      throw Error("Routine validation overflows on desktop");
    if (writes) throw Error("Invalid routine reached a write endpoint");
    return "Recipe/routine validation summaries focus after invalid submits, link across tabs to nested fields, preserve drafts and expose inline errors without writes";
  } finally {
    await context.close();
  }
}
