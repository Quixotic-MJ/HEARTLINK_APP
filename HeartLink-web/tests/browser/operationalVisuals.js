// Four priority workspaces and their dialogs, with synthetic read-only fixtures.
export default async function operationalVisuals(page) {
  const origin = "http://127.0.0.1:5180";
  const context = await page
    .context()
    .browser()
    .newContext({
      serviceWorkers: "block",
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 1000 },
    });
  try {
    const local = await context.newPage(),
      errors = [];
    let writes = 0;
    local.on("pageerror", (error) => errors.push(error.message));
    const ticket = {
      id: "44444444-4444-4444-4444-444444444444",
      ticketId: "FB-1001",
      status: "Open",
      category: "Bug Report",
      adminNotes: "Synthetic follow-up note",
      updated_at: "2026-11-08T01:00:00Z",
      created_at: "2026-11-08T01:00:00Z",
      fullMessage:
        "Synthetic report: the settings button is difficult to locate on a small screen.",
      userId: "synthetic-account",
      deviceMeta: {
        os: "Synthetic OS",
        appVersion: "test",
        model: "Synthetic device",
      },
    };
    await context.route("**/*", (route) => {
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
            first_name: "Synthetic",
            last_name: "Admin",
            email: "synthetic.admin@example.test",
            created_at: "2026-11-08T01:00:00Z",
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
        return route.fulfill({
          status: 500,
          json: { detail: "Unexpected synthetic mutation" },
        });
      }
      if (url.pathname === "/api/admin/broadcasts")
        return route.fulfill({
          json: [
            {
              id: "synthetic-notice",
              title: "Scheduled app maintenance",
              message:
                "Synthetic service notice for visual testing, not an actual announcement.",
              type: "Maintenance",
              target_audience: "All Registered Accounts",
              display_publisher: "Synthetic Admin",
              created_at: "2026-11-08T01:00:00Z",
            },
          ],
        });
      if (url.pathname === "/api/feedback/")
        return route.fulfill({ json: [ticket] });
      if (url.pathname === "/api/admin/activity")
        return route.fulfill({
          json: {
            items: [
              {
                id: "synthetic-event",
                admin_name: "Synthetic Admin",
                action: "updated",
                target_type: "recipe",
                target_name: "Synthetic saved recipe",
                target_id: "synthetic-recipe",
                created_at: "2026-11-08T01:00:00Z",
              },
            ],
            total: 1,
            total_pages: 1,
            page: 1,
            page_size: 20,
            scope: "Known operational metadata only",
            timezone: "Asia/Manila",
          },
        });
      return route.fulfill({ json: [] });
    });
    const results = [];
    for (const [path, name] of [
      ["/broadcasts", "announcements"],
      ["/activity-log", "activity"],
      ["/settings", "settings"],
      ["/feedbacks", "feedback"],
    ]) {
      await local.setViewportSize({ width: 1440, height: 1000 });
      await local.goto(origin + path);
      await local
        .getByRole("main")
        .getByRole("heading", { level: 2 })
        .first()
        .waitFor();
      if (path === "/broadcasts")
        await local
          .getByRole("main")
          .getByText("Scheduled app maintenance", { exact: true })
          .waitFor();
      if (path === "/settings")
        await local
          .getByRole("heading", { name: "Change password", exact: true })
          .waitFor();
      if (path === "/feedbacks")
        await local
          .getByRole("button", { name: "FB-1001", exact: true })
          .waitFor();
      if (path === "/activity-log")
        await local
          .getByRole("region", {
            name: "Operational activity table",
            exact: true,
          })
          .getByText("Synthetic saved recipe", { exact: false })
          .waitFor();
      await local.screenshot({ path: `.tmp/${name}-workspace-desktop.png` });
      for (const viewport of [
        { width: 375, height: 812 },
        { width: 812, height: 375 },
        { width: 1440, height: 1000 },
      ]) {
        await local.setViewportSize(viewport);
        if (
          await local.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error(name + " page overflows " + viewport.width);
      }
      const dialog = local.getByRole("dialog");
      if (path === "/broadcasts") {
        await local
          .getByRole("button", { name: "Create announcement", exact: true })
          .click();
        await dialog
          .getByLabel("Announcement title", { exact: false })
          .fill("Synthetic draft service notice");
        await dialog
          .getByLabel("Announcement message", { exact: false })
          .fill("A factual synthetic service update.");
        await local.waitForFunction(
          () =>
            ![...document.querySelectorAll('[role="dialog"] button')].find(
              (button) => button.textContent.trim() === "Review announcement",
            )?.disabled,
        );
        const aside = await dialog.locator("aside").boundingBox(),
          content = await dialog
            .locator(".operation-modal-content")
            .boundingBox();
        if (!aside || !content || aside.x + aside.width > content.x + 2)
          throw Error("Announcement audience and form are not side-by-side");
        await local.screenshot({
          path: ".tmp/announcement-compose-desktop.png",
        });
      }
      if (path === "/feedbacks") {
        await local
          .getByRole("button", { name: "FB-1001", exact: true })
          .click();
        const submitted = await dialog
            .getByRole("region", { name: "Submitted feedback", exact: true })
            .boundingBox(),
          notes = await dialog
            .getByRole("region", { name: "Internal follow-up", exact: true })
            .boundingBox();
        if (!submitted || !notes || submitted.x + submitted.width > notes.x + 2)
          throw Error(
            "Submitted message and internal notes are not side-by-side",
          );
        await local.screenshot({ path: ".tmp/feedback-ticket-desktop.png" });
      }
      if (path === "/broadcasts" || path === "/feedbacks") {
        for (const viewport of [
          { width: 375, height: 812 },
          { width: 812, height: 375 },
        ]) {
          await local.setViewportSize(viewport);
          const box = await dialog.boundingBox();
          if (
            !box ||
            box.x < 0 ||
            box.y < 0 ||
            box.x + box.width > viewport.width ||
            box.y + box.height > viewport.height
          )
            throw Error(name + " dialog exceeds viewport");
          if (viewport.width === 375)
            await local.screenshot({ path: `.tmp/${name}-dialog-phone.png` });
        }
        await dialog
          .getByRole("button", {
            name:
              path === "/broadcasts" ? "Close announcement" : "Close ticket",
            exact: true,
          })
          .click();
        if (path === "/broadcasts")
          await dialog
            .getByRole("button", { name: "Discard draft", exact: true })
            .click();
        await dialog.waitFor({ state: "hidden" });
      }
      results.push(
        name + ": desktop/phone/landscape layout and available dialog passed",
      );
    }
    if (writes || errors.length)
      throw Error(
        "Read-only visual checks mutated data or crashed: " + errors.join("; "),
      );
    return results;
  } finally {
    await context.close();
  }
}
