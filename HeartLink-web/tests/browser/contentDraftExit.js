// Synthetic, intercepted editor exit checks. No real account, backend or storage.
export default async function contentDraftExit(page) {
  const origin = "http://127.0.0.1:5180";
  const results = [];
  for (const role of ["admin", "dietitian", "pt"]) {
    const context = await page
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
            json: {
              user_id: "synthetic-staff",
              role: role === "admin" ? "admin" : "medical_expert",
              expert_type:
                role === "dietitian" ? "Dietitian" : "Physical Therapist",
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
        if (request.method() !== "GET") writes++;
        if (url.pathname === "/api/recipes")
          return route.fulfill({
            json: [
              {
                id: "synthetic-recipe",
                name: "Synthetic recipe",
                status: "draft",
                expert_validated: false,
                updated_at: "revision-1",
                category: "Lunch",
                ingredients: [
                  { name: "Synthetic ingredient", amount: 1, unit: "pc" },
                ],
                steps: ["Synthetic preparation"],
                servings: 1,
                calories: 100,
                sodium_mg: 10,
              },
            ],
          });
        if (url.pathname === "/api/exercises/")
          return route.fulfill({
            json: [
              {
                id: "synthetic-routine",
                name: "Synthetic routine",
                status: "draft",
                expert_validated: false,
                updated_at: "revision-1",
                description: "Synthetic instructions",
                steps: [
                  {
                    instruction: "Synthetic step",
                    mode: "time",
                    duration_seconds: 30,
                  },
                ],
                duration_minutes: 1,
                type: "Stationary",
                intensity: "Low",
              },
            ],
          });
        return route.fulfill({ json: [] });
      });
      const routes =
        role === "admin"
          ? ["recipe", "routine"]
          : [role === "dietitian" ? "recipe" : "routine"];
      for (const kind of routes) {
        const targetPath = kind === "recipe" ? "/foods" : "/exercises";
        await local.setViewportSize({ width: 1440, height: 900 });
        await local.goto(origin + "/settings");
        await local.locator(`a[href="${targetPath}"]`).first().click();
        await local.setViewportSize({ width: 375, height: 812 });
        const opener = local.getByRole("button", {
          name: `Synthetic ${kind}`,
          exact: true,
        });
        await opener.click();
        const dialog = local.getByRole("dialog");
        await dialog
          .getByRole("button", { name: "Close", exact: true })
          .click();
        await dialog.waitFor({ state: "hidden" });
        await opener.click();
        let field;
        if (role === "admin") {
          await dialog
            .getByRole("button", { name: "Edit details", exact: true })
            .click();
          await dialog
            .getByRole("tab", { name: "Basics", exact: true })
            .click();
          field = dialog.getByLabel(
            kind === "recipe" ? "Food / meal name" : "Routine name",
            { exact: true },
          );
          await field.fill("Synthetic edited name");
          await dialog
            .getByRole("tab", {
              name: kind === "recipe" ? "Ingredients & steps" : "Steps",
              exact: true,
            })
            .click();
          if (kind === "routine")
            await dialog
              .getByRole("button", {
                name: "Edit step 1: Synthetic step",
                exact: true,
              })
              .click();
          field = dialog.getByLabel(
            kind === "recipe" ? "Ingredient 1 name" : "Main part instruction 1",
            { exact: true },
          );
        } else {
          field = dialog.getByLabel(
            kind === "recipe"
              ? "Send back for changes (note required)"
              : "Review feedback (required when requesting changes)",
            { exact: true },
          );
        }
        const draft = `Synthetic unsaved ${kind} ${role}`;
        await field.fill(draft);
        await local.keyboard.press("Escape");
        await dialog
          .getByRole("heading", {
            name: "Discard unsaved changes?",
            exact: true,
          })
          .waitFor({ timeout: 5000 });
        if ((await local.getByRole("dialog").count()) !== 1)
          throw Error("Discard created competing dialogs");
        const keep = dialog.getByRole("button", {
          name: "Keep editing",
          exact: true,
        });
        if (!(await keep.evaluate((el) => el === document.activeElement)))
          throw Error("Discard does not focus its safe action");
        await local.keyboard.press("Shift+Tab");
        if (
          !(await dialog
            .getByRole("button", { name: "Discard draft", exact: true })
            .evaluate((el) => el === document.activeElement))
        )
          throw Error("Discard focus escaped to hidden editor controls");
        await local.keyboard.press("Tab");
        if (!(await keep.evaluate((el) => el === document.activeElement)))
          throw Error("Discard keyboard focus was not trapped");
        await local.keyboard.press("Escape");
        if ((await field.inputValue()) !== draft)
          throw Error("Cancelling discard lost the content/review draft");
        if (!(await field.evaluate((el) => el === document.activeElement)))
          throw Error("Cancelling discard did not restore the field focus");
        let warned = false;
        local.once("dialog", async (prompt) => {
          warned = prompt.type() === "beforeunload";
          await prompt.dismiss();
        });
        await local
          .reload({ waitUntil: "domcontentloaded", timeout: 5000 })
          .catch(() => {});
        if (!warned || (await field.inputValue()) !== draft)
          throw Error("Reload did not warn and retain the unsaved draft");
        await local
          .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
          .catch(() => {});
        await keep.waitFor({ timeout: 5000 });
        await keep.click();
        await keep.waitFor({ state: "hidden", timeout: 3000 });
        if (
          new URL(local.url()).pathname !== targetPath ||
          (await field.inputValue()) !== draft
        )
          throw Error(
            "Cancelling browser Back did not preserve the route and draft",
          );
        await local.mouse.click(4, 4);
        await keep.waitFor({ timeout: 5000 });
        await keep.click();
        await keep.waitFor({ state: "hidden", timeout: 3000 });
        if ((await field.inputValue()) !== draft)
          throw Error("Keep editing lost the draft");
        await dialog
          .getByRole("button", { name: "Close", exact: true })
          .click();
        await dialog
          .getByRole("button", { name: "Discard draft", exact: true })
          .click();
        await dialog.waitFor({ state: "hidden" });
        if (!(await opener.evaluate((el) => el === document.activeElement)))
          throw Error("Discard did not restore opener focus");
        if (writes)
          throw Error("Closing/discarding wrote unpublished content or review");
        await opener.click();
        if (role === "admin") {
          await dialog
            .getByRole("button", { name: "Edit details", exact: true })
            .click();
          await dialog
            .getByRole("tab", { name: "Basics", exact: true })
            .click();
          await dialog
            .getByLabel(
              kind === "recipe" ? "Food / meal name" : "Routine name",
              { exact: true },
            )
            .fill(draft);
        } else {
          await dialog
            .getByLabel(
              kind === "recipe"
                ? "Send back for changes (note required)"
                : "Review feedback (required when requesting changes)",
              { exact: true },
            )
            .fill(draft);
        }
        await local
          .goBack({ waitUntil: "domcontentloaded", timeout: 3000 })
          .catch(() => {});
        await dialog
          .getByRole("button", { name: "Discard draft", exact: true })
          .click();
        await local.waitForURL(origin + "/settings", { timeout: 5000 });
        if (writes || (await local.getByRole("dialog").count()))
          throw Error(
            "Confirmed navigation did not cleanly leave without writes",
          );
        results.push(
          `${role}/${kind}: pristine close, Escape/backdrop confirmation, retained draft/focus, reload warning, explicit discard without writes`,
        );
      }
    } finally {
      await context.close();
    }
  }
  return results;
}
