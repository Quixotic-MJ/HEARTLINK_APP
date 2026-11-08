// Fully intercepted synthetic support/announcement drafts; no actual save or send.
export default async function operationalDraftExit(page) {
  const origin = "http://127.0.0.1:5180",
    results = [];
  for (const kind of ["support", "announcement"]) {
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
      await context.route("**/*", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        if (url.pathname === "/api/auth/me")
          return route.fulfill({
            json: {
              user_id: "synthetic-admin",
              role: "admin",
              account_status: "active",
            },
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
          writes++;
          await new Promise((resolve) => {
            release = resolve;
          });
          return route.fulfill({
            status: 409,
            json: { detail: "Synthetic operational conflict" },
          });
        }
        if (url.pathname === "/api/feedback/")
          return route.fulfill({
            json: [
              {
                id: "44444444-4444-4444-4444-444444444444",
                ticketId: "FB-1001",
                status: "Open",
                category: "Bug Report",
                adminNotes: "Initial synthetic note",
                updated_at: "2026-11-08T01:00:00Z",
                created_at: "2026-11-08T01:00:00Z",
                fullMessage: "Synthetic technical issue",
                deviceMeta: {},
                userId: "synthetic-account",
              },
            ],
          });
        return route.fulfill({ json: [] });
      });
      const path = kind === "support" ? "/feedbacks" : "/broadcasts";
      await local.goto(origin + "/settings");
      await local.locator(`a[href="${path}"]`).first().click();
      await local.setViewportSize({ width: 375, height: 812 });
      const opener = local
        .getByRole("main")
        .getByRole("button", {
          name: kind === "support" ? "FB-1001" : "Create announcement",
          exact: true,
        })
        .first();
      const dialog = local.getByRole("dialog");
      const openAndEdit = async () => {
        await opener.click();
        if (kind === "announcement")
          await dialog
            .getByLabel("Announcement title", { exact: false })
            .fill("Synthetic announcement draft");
        const field = dialog.getByLabel(
          kind === "support" ? "Internal Admin notes" : "Announcement message",
          { exact: kind === "support" },
        );
        await field.fill("Synthetic retained operational draft");
        return field;
      };
      let field = await openAndEdit();
      await local
        .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
        .catch(() => {});
      const keep = dialog.getByRole("button", {
        name: "Keep editing",
        exact: true,
      });
      await keep.waitFor({ timeout: 5000 });
      if (
        (await local.getByRole("dialog").count()) !== 1 ||
        !(await keep.evaluate((el) => el === document.activeElement))
      )
        throw Error("Operational Back did not focus one safe discard prompt");
      await local.keyboard.press("Escape");
      await keep.waitFor({ state: "hidden", timeout: 3000 });
      if (
        new URL(local.url()).pathname !== path ||
        (await field.inputValue()) !== "Synthetic retained operational draft"
      )
        throw Error("Keeping operational draft lost its route or input");
      let warned = false;
      local.once("dialog", async (prompt) => {
        warned = prompt.type() === "beforeunload";
        await prompt.dismiss();
      });
      await local
        .reload({ waitUntil: "domcontentloaded", timeout: 5000 })
        .catch(() => {});
      if (
        !warned ||
        (await field.inputValue()) !== "Synthetic retained operational draft"
      )
        throw Error("Operational reload did not protect the draft");
      await dialog
        .getByRole("button", {
          name: kind === "support" ? "Archive" : "Review announcement",
          exact: true,
        })
        .click();
      await local
        .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
        .catch(() => {});
      await keep.waitFor({ timeout: 5000 });
      await keep.click();
      await keep.waitFor({ state: "hidden", timeout: 3000 });
      await dialog
        .getByRole("heading", {
          name:
            kind === "support"
              ? "Archive support ticket?"
              : "Review announcement",
          exact: true,
        })
        .waitFor();
      await dialog
        .getByRole("button", {
          name: kind === "support" ? "Cancel archive" : "Back to edit",
          exact: true,
        })
        .click();
      if ((await field.inputValue()) !== "Synthetic retained operational draft")
        throw Error(
          "Navigation changed an archive/review confirmation or its draft",
        );
      if (kind === "support")
        await dialog
          .getByRole("button", { name: "Save ticket", exact: true })
          .click();
      else {
        await dialog
          .getByRole("button", { name: "Review announcement", exact: true })
          .click();
        await dialog
          .getByRole("button", { name: "Publish announcement", exact: true })
          .click();
      }
      await local.waitForFunction(
        () => document.querySelector('[role="dialog"][aria-busy="true"]'),
        null,
        { timeout: 3000 },
      );
      await local
        .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
        .catch(() => {});
      await local.waitForURL(origin + path, { timeout: 3000 });
      if ((await keep.count()) || !(await dialog.isVisible()) || writes !== 1)
        throw Error(
          "Operational pending save/send can be escaped or duplicated",
        );
      release();
      await dialog
        .getByRole("alert")
        .filter({ hasText: "Synthetic operational conflict" })
        .waitFor();
      if (kind === "announcement")
        await dialog
          .getByRole("button", { name: "Back to edit", exact: true })
          .click();
      await dialog
        .getByRole("button", {
          name: kind === "support" ? "Close ticket" : "Close announcement",
          exact: true,
        })
        .click();
      await keep.waitFor();
      await keep.click();
      await keep.waitFor({ state: "hidden", timeout: 3000 });
      if ((await field.inputValue()) !== "Synthetic retained operational draft")
        throw Error("Failed operational save lost its draft on close retry");
      await dialog
        .getByRole("button", {
          name: kind === "support" ? "Close ticket" : "Close announcement",
          exact: true,
        })
        .click();
      await dialog
        .getByRole("button", { name: "Discard draft", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
      field = await openAndEdit();
      await local
        .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
        .catch(() => {});
      await dialog
        .getByRole("button", { name: "Discard draft", exact: true })
        .click();
      await local.waitForURL(origin + "/settings", { timeout: 5000 });
      if (writes !== 1)
        throw Error("Operational discard wrote or sent a draft");
      results.push(
        `${kind}: Back/refresh/close retention, pending lock, one failed synthetic write and explicit discard/navigation`,
      );
    } finally {
      release?.();
      await context.close();
    }
  }
  return results;
}
