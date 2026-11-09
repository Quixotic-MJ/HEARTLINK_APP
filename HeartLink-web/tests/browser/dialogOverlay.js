// Synthetic Playwright function-runner entry; every API/external request is intercepted.
export default async function dialogOverlay(page) {
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
    const local = await context.newPage(),
      errors = [];
    let statusAttempts = 0;
    const account = {
      id: "synthetic-consumer",
      role: "patient",
      first_name: "Synthetic",
      last_name: "Account",
      account_status: "active",
      plan: "free",
      created_at: "2026-11-07T01:00:00Z",
    };
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
      if (url.pathname.startsWith("/api/admin/notifications"))
        return route.fulfill({
          json: { items: [], total: 0, unread_count: 0 },
        });
      if (url.pathname === "/api/users/")
        return route.fulfill({ json: [account] });
      if (url.pathname === "/api/admin/staff")
        return route.fulfill({ json: [] });
      if (url.pathname === "/api/admin/users/synthetic-consumer/status") {
        statusAttempts++;
        if (statusAttempts === 1)
          return route.fulfill({
            status: 500,
            json: { detail: "Synthetic status failure" },
          });
        account.account_status = "disabled";
        return route.fulfill({
          json: { status: "success", new_status: "disabled" },
        });
      }
      throw Error("Unexpected overlay request " + url.pathname);
    });
    await local.goto(origin + "/users");
    const opener = local.getByRole("button", {
      name: "Manage Synthetic Account",
      exact: true,
    });
    await opener.click();
    let dialog = local.getByRole("dialog", {
      name: "App account",
      exact: true,
    });
    await dialog
      .getByRole("button", { name: "Disable account", exact: true })
      .click();
    await dialog
      .getByLabel("Reason for disabling", { exact: true })
      .selectOption("User request");
    await dialog
      .getByRole("button", { name: "Confirm disable", exact: true })
      .click();
    await dialog.getByRole("alert").waitFor();
    await local.waitForFunction(
      () =>
        document.querySelector('[role="dialog"] [role="alert"]') ===
        document.activeElement,
      null,
      { timeout: 3000 },
    );
    await dialog
      .getByRole("button", { name: "Confirm disable", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await opener.click();
    dialog = local.getByRole("dialog", { name: "App account", exact: true });
    await dialog.waitFor();
    const check = await dialog
      .getByRole("heading", { name: "App account", exact: true })
      .evaluate((heading) => {
        const box = heading.getBoundingClientRect(),
          hit = document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
        const ancestors = [];
        for (let el = heading.parentElement; el; el = el.parentElement) {
          const s = getComputedStyle(el);
          if (
            s.zIndex !== "auto" ||
            s.transform !== "none" ||
            s.isolation === "isolate"
          )
            ancestors.push({
              tag: el.tagName,
              z: s.zIndex,
              transform: s.transform,
              isolation: s.isolation,
            });
        }
        return {
          visible: hit === heading || heading.contains(hit),
          hit: hit?.tagName,
          hitToast: !!hit?.closest("[data-sonner-toaster]"),
          ancestors,
          toasterZ: getComputedStyle(
            document.querySelector("[data-sonner-toaster]"),
          ).zIndex,
        };
      });
    if (!check.visible)
      throw Error("Dialog heading obscured: " + JSON.stringify(check));
    const closeCovered = await dialog
      .getByRole("button", { name: "Close account details", exact: true })
      .evaluate((button) => {
        const r = button.getBoundingClientRect();
        return [
          [r.x + 4, r.y + 4],
          [r.x + r.width / 2, r.y + r.height / 2],
          [r.right - 4, r.bottom - 4],
        ].some(([x, y]) => !button.contains(document.elementFromPoint(x, y)));
      });
    if (closeCovered) throw Error("Success toast covers account close control");
    await local.keyboard.press("Tab");
    if (!(await dialog.evaluate((el) => el.contains(document.activeElement))))
      throw Error("Dialog focus escaped");
    await local.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    if (!(await opener.evaluate((el) => el === document.activeElement)))
      throw Error("Dialog did not restore focus");
    await local
      .getByRole("button", { name: "Toggle sidebar", exact: true })
      .focus();
    await local.keyboard.press("Enter");
    const menu = local.getByRole("dialog", { name: "Main menu", exact: true });
    await menu.waitFor();
    const menuCloseCovered = await menu
      .getByRole("button", { name: "Close sidebar", exact: true })
      .evaluate((button) => {
        const r = button.getBoundingClientRect();
        return [
          [r.x + 4, r.y + 4],
          [r.x + r.width / 2, r.y + r.height / 2],
          [r.right - 4, r.bottom - 4],
        ].some(([x, y]) => !button.contains(document.elementFromPoint(x, y)));
      });
    if (menuCloseCovered)
      throw Error("Success toast covers mobile-menu close control");
    await local.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await opener.click();
    await dialog.waitFor();
    await local.screenshot({
      path: ".tmp/dialog-overlay-mobile.png",
      fullPage: true,
    });
    if (errors.length) throw Error(errors.join("; "));
    return {
      result:
        "Synthetic toast cannot cover modal or mobile-menu controls; focus trapped/restored",
      stack: check,
    };
  } finally {
    await context.close();
  }
}
