// Synthetic staff form only; every API/external request is intercepted before navigation.
export default async function staffDraftExit(page) {
  const origin = "http://127.0.0.1:5180";
  const context = await page
    .context()
    .browser()
    .newContext({
      serviceWorkers: "block",
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
  let release;
  try {
    const local = await context.newPage();
    let writes = 0;
    const unconfirmed = [
      { status: "success", id: "synthetic-created" },
      { status: "success", id: "synthetic-created", temp_password: "  " },
      { status: "success", temp_password: "SyntheticOnceOnly123!" },
      { id: "synthetic-created", temp_password: "SyntheticOnceOnly123!" },
    ];
    const errors = [];
    local.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", async (route) => {
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
      if (url.pathname.includes("notifications"))
        return route.fulfill({
          json: { items: [], total: 0, unread_count: 0 },
        });
      if (request.method() !== "GET") {
        if (url.pathname !== "/api/admin/staff" || request.method() !== "POST")
          throw Error("Unexpected mutation");
        writes++;
        const data = request.postDataJSON();
        if (
          data.name !== "Synthetic New Reviewer" ||
          data.email !== "synthetic.reviewer@example.test" ||
          data.role !== "Authorized Medical Expert" ||
          data.expert_type !== "Dietitian"
        )
          throw Error("Provisioning payload changed");
        if (writes > 1 && writes <= unconfirmed.length + 1)
          return route.fulfill({ json: unconfirmed[writes - 2] });
        if (writes === unconfirmed.length + 2)
          return route.fulfill({
            json: {
              status: "success",
              id: "synthetic-created",
              temp_password: "SyntheticOnceOnly123!",
            },
          });
        await new Promise((resolve) => {
          release = resolve;
        });
        return route.fulfill({
          status: 500,
          json: { detail: "Synthetic provisioning failure" },
        });
      }
      return route.fulfill({ json: [] });
    });
    await local.goto(origin + "/settings");
    await local.locator('a[href="/users"]').first().click();
    await local
      .getByRole("tab", { name: "System staff", exact: false })
      .click();
    await local.setViewportSize({ width: 375, height: 812 });
    const open = local.getByRole("button", {
      name: "Create staff account",
      exact: true,
    });
    const dialog = local.getByRole("dialog");
    await open.click();
    await dialog
      .getByRole("button", { name: "Provision account", exact: true })
      .click();
    await dialog
      .getByText("Name must be at least 2 characters.", { exact: true })
      .waitFor();
    if (writes) throw Error("Invalid staff form reached provisioning");
    // An unchanged form still closes without an unnecessary confirmation.
    await local.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await open.click();
    const name = dialog.getByLabel("Full name", { exact: false });
    await name.fill("Synthetic New Reviewer");
    await dialog
      .getByLabel("Email address", { exact: false })
      .fill("synthetic.reviewer@example.test");
    await dialog
      .getByLabel("Expert specialization", { exact: false })
      .selectOption("Dietitian");
    await name.focus();
    await local
      .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
      .catch(() => {});
    const keep = dialog.getByRole("button", {
      name: "Keep editing",
      exact: true,
    });
    await keep.waitFor({ timeout: 5000 });
    if (
      (await dialog.count()) !== 1 ||
      !(await keep.evaluate((el) => el === document.activeElement))
    )
      throw Error("Staff Back did not focus one safe discard prompt");
    await local.keyboard.press("Escape");
    await keep.waitFor({ state: "hidden" });
    if (
      new URL(local.url()).pathname !== "/users" ||
      (await name.inputValue()) !== "Synthetic New Reviewer"
    )
      throw Error("Staff keep-editing lost its route or draft");
    await name.evaluate((el) => {
      if (el !== document.activeElement)
        throw Error("Staff field focus was lost");
    });
    let warned = false;
    local.once("dialog", async (prompt) => {
      warned = prompt.type() === "beforeunload";
      await prompt.dismiss();
    });
    await local
      .reload({ waitUntil: "domcontentloaded", timeout: 5000 })
      .catch(() => {});
    if (!warned || (await name.inputValue()) !== "Synthetic New Reviewer")
      throw Error("Staff reload lost an unconfirmed draft");
    await dialog
      .getByRole("button", { name: "Close modal", exact: true })
      .click();
    await keep.waitFor();
    await keep.click();
    await keep.waitFor({ state: "hidden" });
    const save = dialog.getByRole("button", {
      name: "Provision account",
      exact: true,
    });
    await save.evaluate((el) => {
      el.click();
      el.click();
    });
    await local.waitForFunction(
      () =>
        document.querySelector('[role="dialog"]')?.getAttribute("aria-busy") ===
        "true",
    );
    if (
      !(await name.isDisabled()) ||
      !(await dialog
        .getByLabel("Expert specialization", { exact: false })
        .isDisabled())
    )
      throw Error("Pending staff fields remain editable");
    await local.keyboard.press("Escape");
    await local
      .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
      .catch(() => {});
    await local.waitForURL(origin + "/users", { timeout: 5000 });
    if (
      new URL(local.url()).pathname !== "/users" ||
      !(await dialog.isVisible()) ||
      (await keep.count()) ||
      writes !== 1
    )
      throw Error("Pending staff provisioning escaped or duplicated");
    if (!release) throw Error("Synthetic provisioning did not begin");
    release();
    release = undefined;
    const error = dialog
      .getByRole("alert")
      .filter({ hasText: "Synthetic provisioning failure" });
    await error.waitFor();
    await local.waitForFunction(
      () =>
        document.querySelector('[role="dialog"] [role="alert"]') ===
        document.activeElement,
    );
    if (
      (await name.inputValue()) !== "Synthetic New Reviewer" ||
      (await dialog
        .getByLabel("Expert specialization", { exact: false })
        .inputValue()) !== "Dietitian"
    )
      throw Error("Staff failure cleared draft values");
    await local.keyboard.press("Escape");
    await keep.waitFor();
    await dialog
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await open.click();
    if ((await name.inputValue()) !== "")
      throw Error("Discarded staff fields leaked into a new form");
    await local.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    // Explicitly discarding during Back proceeds without provisioning anything.
    await open.click();
    await name.fill("Synthetic discarded draft");
    await local
      .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
      .catch(() => {});
    await keep.waitFor();
    await dialog
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    await local.waitForURL(origin + "/settings");
    if (writes !== 1 || errors.length)
      throw Error(
        "Staff discard wrote data or caused a runtime error: " +
          errors.join("; "),
      );
    await local.setViewportSize({ width: 1440, height: 900 });
    await local.locator('a[href="/users"]').first().click();
    await local
      .getByRole("tab", { name: "System staff", exact: false })
      .click();
    await open.click();
    await name.fill("Synthetic New Reviewer");
    await dialog
      .getByLabel("Email address", { exact: false })
      .fill("synthetic.reviewer@example.test");
    await dialog
      .getByLabel("Expert specialization", { exact: false })
      .selectOption("Dietitian");
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 812, height: 375 },
      { width: 1440, height: 900 },
    ]) {
      await local.setViewportSize(viewport);
      const bounds = await dialog.boundingBox();
      if (
        !bounds ||
        bounds.x < 0 ||
        bounds.y < 0 ||
        bounds.x + bounds.width > viewport.width ||
        bounds.y + bounds.height > viewport.height ||
        (await local.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ))
      )
        throw Error("Staff dialog exceeds the viewport");
    }
    for (let index = 0; index < unconfirmed.length; index++) {
      await save.click();
      await dialog
        .getByRole("alert")
        .filter({ hasText: "Provisioning was not confirmed" })
        .waitFor({ timeout: 5000 });
      if (
        writes !== index + 2 ||
        (await name.inputValue()) !== "Synthetic New Reviewer" ||
        (await local
          .getByRole("dialog", { name: "Account created", exact: true })
          .count()) ||
        (await local
          .getByText("Staff account provisioned", { exact: true })
          .count())
      )
        throw Error(
          "Incomplete provisioning response announced success or lost the draft",
        );
    }
    await save.click();
    const credentials = local.getByRole("dialog", {
      name: "Account created",
      exact: true,
    });
    await credentials.waitFor();
    if (
      (await dialog.count()) !== 1 ||
      (await credentials
        .getByLabel("Temporary password", { exact: true })
        .inputValue()) !== "SyntheticOnceOnly123!" ||
      writes !== unconfirmed.length + 2
    )
      throw Error(
        "Confirmed provisioning did not reach the existing one-time password handoff",
      );
    await local.keyboard.press("Escape");
    if (!(await credentials.isVisible()))
      throw Error("Escape lost the one-time password handoff");
    await credentials
      .getByRole("button", { name: "I've copied it", exact: true })
      .click();
    await credentials.waitFor({ state: "hidden" });
    if ((await keep.count()) || errors.length)
      throw Error(
        "Confirmed provisioning retained an unwanted draft prompt or runtime error",
      );
    return "Staff draft close/Back/refresh protection, safe focus, explicit discard, pending field/duplicate/navigation lock and failed-provision retention passed";
  } finally {
    release?.();
    await context.close();
  }
}
