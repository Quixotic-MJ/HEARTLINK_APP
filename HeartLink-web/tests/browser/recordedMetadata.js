// Read-only synthetic metadata across time zones; no real accounts or history.
export default async function recordedMetadata(page) {
  const origin = "http://127.0.0.1:5180",
    context = await page
      .context()
      .browser()
      .newContext({
        serviceWorkers: "block",
        reducedMotion: "reduce",
        timezoneId: "America/Los_Angeles",
        viewport: { width: 375, height: 812 },
      });
  try {
    const local = await context.newPage();
    let invalidDate = false,
      writes = 0;
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
      if (url.pathname.includes("notifications"))
        return route.fulfill({
          json: { items: [], total: 0, unread_count: 0 },
        });
      if (request.method() !== "GET") writes++;
      const review = {
        status: "draft",
        expert_validated: true,
        reviewed_by: "synthetic-expert",
        reviewed_at: invalidDate ? "not-a-date" : "2026-11-08T00:30:00Z",
        updated_at: "revision-1",
      };
      if (url.pathname === "/api/recipes")
        return route.fulfill({
          json: [
            {
              ...review,
              id: "synthetic-recipe",
              name: "Synthetic approved recipe",
              category: "Lunch",
              servings: 1,
              calories: 100,
              sodium_mg: 10,
              ingredients: [
                { name: "Synthetic ingredient", amount: 1, unit: "pc" },
              ],
              steps: ["Synthetic preparation"],
            },
          ],
        });
      if (url.pathname === "/api/exercises/")
        return route.fulfill({
          json: [
            {
              ...review,
              id: "synthetic-routine",
              name: "Synthetic approved routine",
              description: "Synthetic instructions",
              type: "Stationary",
              intensity: "Low",
              duration_minutes: 1,
              steps: [
                {
                  instruction: "Synthetic movement",
                  mode: "time",
                  duration_seconds: 30,
                },
              ],
            },
          ],
        });
      if (url.pathname === "/api/admin/broadcasts")
        return route.fulfill({
          json: [
            {
              id: "synthetic-notice",
              title: "Synthetic legacy notice",
              message: "Synthetic retained service message",
              type: "Unknown legacy category",
              target_audience: "All Registered Accounts",
              created_at: "2026-11-08T00:30:00Z",
            },
            {
              id: "synthetic-general-notice",
              title: "Synthetic general notice",
              message: "Synthetic general service message",
              type: "General",
              target_audience: "All Registered Accounts",
              created_at: "2026-11-08T00:30:00Z",
            },
          ],
        });
      return route.fulfill({ json: [] });
    });
    for (const [path, label] of [
      ["/foods", "recipe"],
      ["/exercises", "routine"],
    ]) {
      for (const invalid of [false, true]) {
        invalidDate = invalid;
        await local.goto(origin + path);
        await local
          .getByRole("button", {
            name: `Synthetic approved ${label}`,
            exact: true,
          })
          .click();
        const dialog = local.getByRole("dialog");
        const text = await dialog.innerText();
        if (!invalid && !text.includes("Nov 8, 2026 (Asia/Manila)"))
          throw Error(
            `${label} review date depends on the staff device timezone or lacks its timezone label`,
          );
        if (invalid && (text.includes("Invalid Date") || text.includes("1970")))
          throw Error(`${label} renders an invented or invalid review date`);
        await dialog
          .getByRole("button", { name: "Close", exact: true })
          .click();
      }
    }
    await local.goto(origin + "/broadcasts");
    await local
      .getByRole("main")
      .getByText("Synthetic legacy notice", { exact: true })
      .first()
      .waitFor({ timeout: 5000 });
    if (
      !(await local
        .getByRole("main")
        .getByText("Category unavailable", { exact: true })
        .count())
    )
      throw Error("Unknown announcement category is mislabeled as General");
    const main = local.getByRole("main");
    const general = main.getByRole("button", { name: /^General\s*1$/ });
    await general.waitFor({ timeout: 5000 });
    await general.click();
    await main
      .getByText("Synthetic general notice", { exact: true })
      .first()
      .waitFor();
    if (
      await main.getByText("Synthetic legacy notice", { exact: true }).count()
    )
      throw Error("General filter reclassified an unknown category");
    await main.getByRole("button", { name: /^All\s*2$/ }).click();
    await main.getByText("Category unavailable", { exact: true }).waitFor();
    if (writes) throw Error("Metadata display checks changed a stored record");
    return "Review dates use labelled Asia/Manila independently of staff timezone, invalid dates stay unavailable, unknown announcement categories are not invented";
  } finally {
    await context.close();
  }
}
