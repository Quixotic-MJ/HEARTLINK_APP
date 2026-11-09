// Exercises the actual synthetic middleware, not intercepted/mocked API responses.
export default async function syntheticPreview(page) {
  const origin = "http://127.0.0.1:5181";
  const context = await page.context().browser().newContext({
    serviceWorkers: "block", reducedMotion: "reduce", viewport: { width: 1440, height: 1000 },
  });
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const errors = [], external = [], apiErrors = [];
  try {
    const local = await context.newPage();
    local.setDefaultTimeout(12000);
    local.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        external.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    local.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 400) apiErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    await local.goto(origin + "/login");
    await local.getByRole("heading", { name: "Explore the website.", exact: true }).waitFor();
    assert(await local.locator("input").count() === 0, "Real credential input is exposed");
    const selectRole = async (label) => {
      await local.goto(origin + "/__preview");
      await local.getByRole("button", { name: label, exact: false }).click();
      try { await local.getByRole("main").waitFor(); }
      catch (error) {
        await local.screenshot({ path: ".tmp/synthetic-preview-failure.png" });
        throw Error(`${error.message}; url=${local.url()}; pageErrors=${errors.join("; ")}; API=${apiErrors.join(", ")}; text=${(await local.locator("body").innerText()).slice(0, 500)}`, { cause: error });
      }
      await local.getByRole("complementary", { name: "Synthetic preview notice" }).waitFor();
    };
    await selectRole("Admin");
    await local.getByRole("heading", { name: "Content workflow", exact: true }).waitFor();
    assert(await local.locator("#portal-sidebar").evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight + 1), "Preview banner clips sidebar account controls");
    const paths = ["/foods", "/exercises", "/users", "/broadcasts", "/activity-log", "/feedbacks", "/premium", "/settings", "/notifications", "/analytics", "/"];
    for (const path of paths) {
      await local.goto(origin + path);
      await local.getByRole("main").waitFor();
      // Wait for real fixture rendering and lazy UI effects before checking for crash surfaces.
      await local.waitForLoadState("networkidle");
      assert(await local.locator("body").innerText().then((text) => !text.includes("Unexpected Application Error")), `Crashed ${path}`);
    }
    await local.locator('a[href="/login"]').first().click();
    await local.getByRole("heading", { name: "Explore the website.", exact: true }).waitFor();
    assert(await local.locator('input[type="password"]').count() === 0, "Landing sign-in opens real credential form");
    await selectRole("Admin");
    await local.goto(origin + "/foods");
    await local.getByRole("button", { name: "Garden rice bowl", exact: true }).waitFor();
    assert(await local.locator(".library-card").count() === 4, "Recipe fixtures missing");
    await local.getByRole("button", { name: "Add recipe", exact: true }).click();
    await local.getByRole("dialog").waitFor();
    await local.screenshot({ path: ".tmp/synthetic-preview-recipe-dialog.png" });
    await local.keyboard.press("Escape");
    await local.goto(origin + "/exercises");
    await local.getByRole("button", { name: "List view", exact: true }).click();
    await local.getByText("Gentle mobility sample", { exact: true }).waitFor();
    assert(await local.locator('img[src*="/__preview/media/exercise-"]').count() >= 1, "Exercise list lacks local media");
    await local.screenshot({ path: ".tmp/synthetic-preview-exercises.png" });
    assert(apiErrors.length === 0, `Unexpected browse errors: ${apiErrors.join(", ")}`);
    for (const [label, home, endpoint, forbidden] of [
      ["Dietitian", "/foods", "/api/recipes", "/api/exercises/"],
      ["Physical Therapist", "/exercises", "/api/exercises/", "/api/recipes"],
      ["Cardiologist", "/notifications", "/api/admin/notifications", "/api/admin/dashboard"],
    ]) {
      await selectRole(label);
      await local.waitForURL(origin + home);
      const statuses = await local.evaluate(async ([allowed, denied]) => [
        (await fetch(allowed)).status, (await fetch(denied)).status,
        (await fetch("/api/recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status,
      ], [endpoint, forbidden]);
      assert(statuses.join(",") === "200,403,403", `Role/write boundary failed: ${label}`);
      await local.setViewportSize({ width: 375, height: 812 });
      assert(await local.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Preview overflow: ${label}`);
      await local.setViewportSize({ width: 1440, height: 1000 });
    }
    await local.goto(origin + "/__preview");
    await local.screenshot({ path: ".tmp/synthetic-preview-chooser.png" });
    assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
    assert(external.length === 0, `External network attempted: ${external.join(", ")}`);
    return { roles: 4, adminPages: paths.length + 1, localMedia: true, modal: true, narrowViewport: true, unexpectedApiErrors: 0, externalRequests: 0, pageErrors: 0 };
  } finally { await context.close(); }
}
