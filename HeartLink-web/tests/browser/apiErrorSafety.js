// Synthetic error envelopes only. Never contacts a real backend or upload store.
export default async function apiErrorSafety(page) {
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
    const fallback =
      "The request could not be completed. Try again.";
    const uploadFallback = "The image upload was not confirmed. Try again.";
    const cases = [
      { detail: "Synthetic preserved error", code: "synthetic-code" },
      {
        detail: [
          {
            loc: ["body", "servings"],
            msg: "Synthetic validation error",
            input: "synthetic-private-echo",
          },
        ],
      },
      { detail: { message: "synthetic-private-echo" } },
      { detail: null },
      { detail: "  " },
      null,
      [],
      "synthetic-private-echo",
    ];
    let saveError = cases[1],
      writes = 0;
    local.on("pageerror", (error) => errors.push(error.message));
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
      if (url.pathname === "/api/synthetic-client-error")
        return route.fulfill({
          status: 422,
          json: cases[Number(url.searchParams.get("case"))],
        });
      if (url.pathname === "/api/upload/")
        return route.fulfill({ status: 422, json: cases[2] });
      if (url.pathname === "/api/recipes" && request.method() === "GET")
        return route.fulfill({
          json: [
            {
              id: "synthetic-recipe",
              name: "Synthetic recipe",
              category: "Lunch",
              servings: 1,
              calories: 100,
              sodium_mg: 10,
              status: "draft",
              updated_at: "revision-1",
              ingredients: [
                { name: "Synthetic ingredient", amount: 1, unit: "pc" },
              ],
              steps: ["Synthetic preparation"],
            },
          ],
        });
      if (
        url.pathname === "/api/recipes/synthetic-recipe" &&
        request.method() === "PUT"
      ) {
        writes++;
        return route.fulfill({ status: 422, json: saveError });
      }
      throw Error("Unexpected API-error test request " + url.pathname);
    });
    await local.goto(origin + "/foods");
    await local
      .getByRole("button", { name: "Synthetic recipe", exact: true })
      .click();
    const dialog = local.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Edit details", exact: true })
      .click();
    const name = dialog.getByLabel("Food / meal name", { exact: true });
    await name.fill("Synthetic retained draft");
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await dialog
      .getByRole("alert")
      .filter({ hasText: fallback })
      .waitFor({ timeout: 5000 });
    if (
      (await name.inputValue()) !== "Synthetic retained draft" ||
      errors.length
    )
      throw Error("Structured save error crashed the UI or lost its draft");
    await dialog.getByRole("tab", { name: "Picture", exact: true }).click();
    await dialog
      .getByLabel("Dish photograph", { exact: true })
      .setInputFiles({
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: globalThis.Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jcXkAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    await dialog
      .getByRole("alert")
      .filter({ hasText: uploadFallback })
      .waitFor({ timeout: 5000 });
    if (
      (await local.locator("body").innerText()).includes(
        "synthetic-private-echo",
      )
    )
      throw Error("Structured error echoed its input into the UI");
    const replies = await local.evaluate(async (count) => {
      const { apiFetch } = await import("/src/lib/api.js");
      const responses = [];
      for (let index = 0; index < count; index++) {
        try {
          await apiFetch("/api/synthetic-client-error?case=" + index);
          throw Error("Synthetic failure resolved as success");
        } catch (error) {
          responses.push({
            status: error.status,
            detail: error.data?.detail,
            code: error.data?.code,
          });
        }
      }
      return responses;
    }, cases.length);
    if (
      replies[0].detail !== "Synthetic preserved error" ||
      replies[0].code !== "synthetic-code"
    )
      throw Error("Normal error text or metadata changed");
    if (
      replies.some(
        (reply, index) =>
          reply.status !== 422 || (index > 0 && reply.detail !== fallback),
      )
    )
      throw Error(
        "Malformed API errors are not consistently safe strings with original status",
      );
    saveError = cases[0];
    await dialog.getByRole("tab", { name: "Basics", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await dialog
      .getByRole("alert")
      .filter({ hasText: "Synthetic preserved error" })
      .waitFor({ timeout: 5000 });
    if (
      writes !== 2 ||
      (await name.inputValue()) !== "Synthetic retained draft" ||
      errors.length
    )
      throw Error("Error retry lost draft or duplicated the request");
    return "Structured/null/blank errors stay safe, normal messages/status/metadata survive, failed saves/uploads retain UI and drafts without echoed input";
  } finally {
    await context.close();
  }
}
