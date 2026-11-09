// Synthetic account UI only; all API and external requests are intercepted before navigation.
export default async function premiumConfirmation(page) {
  const origin = "http://127.0.0.1:5180";
  const context = await page.context().browser().newContext({
    serviceWorkers: "block",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  let release, local;
  try {
    local = await context.newPage();
    local.setDefaultTimeout(5000);
    const writes = [];
    const errors = [];
    let response = "success";
    local.on("pageerror", (error) => errors.push(error.message));
    local.on("console", (message) => {
      if (message.text().includes("only supports one blocker")) errors.push(message.text());
    });
    const account = {
      id: "synthetic-premium-account",
      role: "patient",
      first_name: "Synthetic",
      last_name: "Account",
      account_status: "active",
      plan: "free",
      created_at: "2026-11-07T01:00:00Z",
    };
    const accounts = [account, {
      ...account, id: "synthetic-premium-active", last_name: "Premium", plan: "premium", premium_until: "2099-01-01T00:00:00Z",
    }, {
      ...account, id: "synthetic-premium-expired", last_name: "Expired", plan: "premium", premium_until: "2020-01-01T00:00:00Z",
    }];
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
      if (url.pathname.startsWith("/api/admin/notifications"))
        return route.fulfill({ json: { items: [], total: 0, unread_count: 0 } });
      if (url.pathname === "/api/users/") return route.fulfill({ json: accounts });
      if (url.pathname === "/api/admin/staff") return route.fulfill({ json: [] });
      const target = accounts.find((item) => url.pathname === `/api/admin/users/${item.id}/plan`);
      if (target && request.method() === "PUT") {
        const payload = request.postDataJSON();
        writes.push({ id: target.id, ...payload });
        if (response === "hold-failure") {
          await new Promise((resolve) => { release = resolve; });
          return route.fulfill({ status: 500, json: { detail: "Synthetic Premium failure. Try again." } });
        }
        target.plan = payload.premium ? "premium" : "free";
        target.premium_until = payload.premium ? "2099-01-01T00:00:00Z" : null;
        return route.fulfill({ json: { status: "success" } });
      }
      throw Error("Unexpected Premium check request " + request.method() + " " + url.pathname);
    });
    await local.goto(origin + "/settings");
    await local.locator('a[href="/users"]').first().click();
    await local.getByRole("button", { name: "Manage Synthetic Account", exact: true }).waitFor();
    await local.locator(".accounts-workspace").getByRole("button").evaluateAll((buttons) => {
      const small = buttons.filter((button) => {
        const bounds = button.getBoundingClientRect();
        return bounds.width < 44 || bounds.height < 44;
      });
      if (small.length) throw Error("Account controls below 44px: " + small.map((button) => button.textContent).join(", "));
    });
    const opener = local.getByRole("button", { name: "Manage Synthetic Account", exact: true });
    await opener.click();
    const dialog = local.getByRole("dialog", { name: "App account", exact: true });
    const reviewHeading = dialog.getByRole("heading", { name: "Review Premium change", exact: true });
    const confirm = dialog.getByRole("button", { name: "Confirm Premium change", exact: true });
    await dialog.getByLabel("Premium length", { exact: true }).selectOption("90");
    await dialog.getByRole("button", { name: "Give Premium", exact: true }).click();
    await reviewHeading.waitFor({ timeout: 3000 });
    if (writes.length) throw Error("Entering Premium review wrote the entitlement");
    await dialog.getByText("Give Premium · 90 days", { exact: true }).waitFor();
    await dialog.getByRole("button", { name: "Back", exact: true }).evaluate((button) => {
      if (button !== document.activeElement) throw Error("Review did not focus the safe Back action");
    });
    await dialog.getByRole("button", { name: "Back", exact: true }).click();
    if ((await dialog.getByLabel("Premium length", { exact: true }).inputValue()) !== "90") throw Error("Back lost the chosen duration");
    await dialog.getByRole("button", { name: "Give Premium", exact: true }).evaluate((button) => {
      if (button !== document.activeElement) throw Error("Back did not restore the review opener");
    });
    await dialog.getByRole("button", { name: "Give Premium", exact: true }).click();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    if (writes.length) throw Error("Canceling Premium review wrote the entitlement");
    await opener.evaluate((button) => {
      if (button !== document.activeElement) throw Error("Cancel did not restore account opener focus");
    });
    await opener.click();
    await dialog.getByRole("button", { name: "Give Premium", exact: true }).click();
    await local.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    if (writes.length) throw Error("Escape from review wrote the entitlement");
    await opener.click();
    await dialog.getByRole("button", { name: "Give Premium", exact: true }).click();
    await local.goBack({ waitUntil: "domcontentloaded", timeout: 3000 }).catch(() => {});
    await local.waitForURL(origin + "/settings");
    if (writes.length || (await local.getByText("Discard draft", { exact: true }).count())) throw Error("Mere Premium review created an unsaved-draft warning or write");
    await local.locator('a[href="/users"]').first().click();
    await opener.click();
    await dialog.getByLabel("Premium length", { exact: true }).selectOption("90");
    await dialog.getByRole("button", { name: "Give Premium", exact: true }).click();
    response = "hold-failure";
    const requested = local.waitForRequest((request) => request.method() === "PUT" && request.url().endsWith("/plan"));
    await confirm.evaluate((button) => { button.click(); button.click(); });
    await requested;
    await local.waitForFunction(() => document.querySelector('[role="dialog"]')?.getAttribute("aria-busy") === "true");
    if (!(await dialog.getByRole("button").evaluateAll((buttons) => buttons.every((button) => button.disabled)))) throw Error("Pending Premium controls remain active");
    await local.keyboard.press("Escape");
    await local.mouse.click(4, 4);
    await local.goBack({ waitUntil: "domcontentloaded", timeout: 3000 }).catch(() => {});
    await local.waitForURL(origin + "/users");
    if (!(await dialog.isVisible()) || writes.length !== 1 || (await local.getByText("Discard draft", { exact: true }).count())) throw Error("Pending Premium save escaped, duplicated, or showed a draft prompt");
    let reloadWarned = false;
    local.once("dialog", async (prompt) => {
      reloadWarned = prompt.type() === "beforeunload";
      await prompt.dismiss();
    });
    await local.reload({ waitUntil: "domcontentloaded", timeout: 3000 }).catch(() => {});
    if (!reloadWarned || !(await dialog.isVisible()) || writes.length !== 1) throw Error("Pending Premium reload was not guarded");
    if (!release) throw Error("Synthetic Premium save did not begin");
    release();
    release = undefined;
    const failure = dialog.getByRole("alert").filter({ hasText: "Synthetic Premium failure" });
    await failure.waitFor({ timeout: 5000 }).catch(async (error) => {
      throw Error(error.message + " " + JSON.stringify({ url: local.url(), dialogs: await local.getByRole("dialog").allTextContents(), writes, errors }), { cause: error });
    });
    await failure.evaluate((alert) => {
      if (alert !== document.activeElement) throw Error("Premium failure did not receive focus");
    });
    await reviewHeading.waitFor();
    await dialog.getByText("Give Premium · 90 days", { exact: true }).waitFor();
    if (!(await confirm.isEnabled())) throw Error("Failed Premium save cannot be retried");
    response = "success";
    await confirm.click();
    await dialog.waitFor({ state: "hidden" });
    if (JSON.stringify(writes) !== JSON.stringify([
      { id: account.id, premium: true, days: 90 }, { id: account.id, premium: true, days: 90 },
    ])) throw Error("Retry changed the reviewed Premium payload: " + JSON.stringify(writes));

    const premiumOpener = local.getByRole("button", { name: "Manage Synthetic Premium", exact: true });
    await premiumOpener.click();
    await dialog.getByLabel("Premium length", { exact: true }).selectOption("365");
    await dialog.getByRole("button", { name: "Add Premium time", exact: true }).click();
    await dialog.getByText("Extend Premium · 365 days", { exact: true }).waitFor();
    await dialog.getByText("Premium until Jan 1, 2099", { exact: true }).waitFor();
    await dialog.getByText("The server adds this time", { exact: false }).waitFor();
    if (writes.length !== 2) throw Error("Premium extension wrote before confirmation");
    for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }, { width: 1440, height: 900 }]) {
      await local.setViewportSize(viewport);
      const bounds = await dialog.boundingBox();
      if (!bounds || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > viewport.width || bounds.y + bounds.height > viewport.height || await local.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error("Premium dialog exceeds viewport " + JSON.stringify(viewport));
      await confirm.evaluate((button) => {
        const box = button.getBoundingClientRect();
        if (box.top < 0 || box.bottom > innerHeight || !button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))) throw Error("Premium confirmation is obscured");
      });
      await local.screenshot({ path: `.tmp/premium-review-${viewport.width}.png`, fullPage: true });
    }
    await confirm.click();
    await dialog.waitFor({ state: "hidden" });
    if (JSON.stringify(writes[2]) !== JSON.stringify({ id: "synthetic-premium-active", premium: true, days: 365 })) throw Error("Extension payload changed");
    await premiumOpener.click();
    await dialog.getByRole("button", { name: "Remove Premium", exact: true }).click();
    await reviewHeading.waitFor();
    if (writes.length !== 3) throw Error("Premium removal wrote before confirmation");
    await dialog.getByRole("button", { name: "Back", exact: true }).click();
    await dialog.getByRole("button", { name: "Remove Premium", exact: true }).evaluate((button) => {
      if (button !== document.activeElement) throw Error("Removal Back lost safe focus");
    });
    await dialog.getByRole("button", { name: "Remove Premium", exact: true }).click();
    await dialog.getByRole("button", { name: "Confirm removal", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    if (JSON.stringify(writes[3]) !== JSON.stringify({ id: "synthetic-premium-active", premium: false })) throw Error("Removal payload changed");
    await local.getByRole("button", { name: "Manage Synthetic Expired", exact: true }).click();
    await dialog.getByRole("button", { name: "Give Premium", exact: true }).click();
    await dialog.getByText("Free plan", { exact: true }).waitFor();
    await dialog.getByText("Premium starts from the server’s current date", { exact: false }).waitFor();
    await dialog.getByText("Give Premium · 30 days", { exact: true }).waitFor();
    if (writes.length !== 4) throw Error("Expired Premium wrote before confirmation");
    await confirm.click();
    await dialog.waitFor({ state: "hidden" });
    if (JSON.stringify(writes[4]) !== JSON.stringify({ id: "synthetic-premium-expired", premium: true, days: 30 })) throw Error("Expired Premium payload changed");
    await local.screenshot({ path: ".tmp/accounts-directory-desktop.png", fullPage: true });
    await local.setViewportSize({ width: 375, height: 812 });
    await opener.click();
    await local.screenshot({ path: ".tmp/account-details-mobile.png", fullPage: true });
    if (errors.length) throw Error(errors.join("; "));
    return "Premium add/extend/remove require explicit review; Back/Cancel/Escape make no writes; pending close/navigation/reload and double-click are guarded; errors retain review/duration and retry; 375/812/1440 viewports fit";
  } catch (failure) {
    await local?.screenshot({ path: ".tmp/premium-check-failure.png", fullPage: true });
    throw Error(failure.message + " Current UI: " + JSON.stringify({ url: local?.url(), dialogs: await local?.getByRole("dialog").allTextContents() }), { cause: failure });
  } finally {
    release?.();
    await context.close();
  }
}
