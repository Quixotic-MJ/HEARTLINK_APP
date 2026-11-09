// Synthetic lifecycle checks; no real API, database, content or history is changed.
export default async function routineSafety(page) {
  const origin = "http://127.0.0.1:5180",
    context = await page
      .context()
      .browser()
      .newContext({
        serviceWorkers: "block",
        reducedMotion: "reduce",
        viewport: { width: 375, height: 812 },
      });
  let releaseUpload;
  try {
    const local = await context.newPage(),
      writes = [];
    let fail = true;
    let routine = {
      id: "synthetic-routine",
      name: "Synthetic routine",
      description: "Synthetic instructions",
      type: "Stationary",
      intensity: "Low",
      duration_minutes: 1,
      status: "draft",
      expert_validated: false,
      updated_at: "revision-1",
      steps: [
        {
          instruction: "Synthetic movement",
          mode: "time",
          duration_seconds: 30,
        },
      ],
    };
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
      if (url.pathname === "/api/upload/") {
        await new Promise((resolve) => {
          releaseUpload = resolve;
        });
        return route.fulfill({ json: { url: "/static/synthetic-step.png" } });
      }
      if (url.pathname === "/api/exercises/" && request.method() === "GET")
        return route.fulfill({ json: [routine] });
      if (
        url.pathname === "/api/exercises/synthetic-routine" &&
        request.method() === "PUT"
      ) {
        const body = request.postDataJSON();
        writes.push(body);
        if (
          Object.keys(body).sort().join(",") !== "expectedUpdatedAt,status" ||
          body.expectedUpdatedAt !== routine.updated_at
        )
          throw Error(
            "Lifecycle action edited content or used a stale revision",
          );
        if (fail)
          return route.fulfill({
            status: 409,
            json: { detail: "Synthetic archive conflict" },
          });
        routine = {
          ...routine,
          status: body.status,
          updated_at: `revision-${writes.length}`,
        };
        return route.fulfill({ json: routine });
      }
      throw Error(
        "Unexpected routine safety request " +
          request.method() +
          " " +
          url.pathname,
      );
    });
    await local.goto(origin + "/exercises");
    const action = async (name) => {
      await local
        .getByRole("button", {
          name: "Actions for Synthetic routine",
          exact: true,
        })
        .click();
      await local.getByRole("menuitem", { name, exact: true }).click();
    };
    await local
      .getByRole("button", { name: "Synthetic routine", exact: true })
      .click();
    const dialog = local.getByRole("dialog");
    if (
      await dialog
        .getByRole("button", { name: "More actions", exact: true })
        .count()
    )
      throw Error(
        "Routine editor retains duplicate unconfirmed lifecycle actions",
      );
    if (await dialog.getByText("Delete exercise", { exact: true }).count())
      throw Error("Routine editor retains a permanent-delete path");
    await dialog
      .getByRole("button", { name: "Edit details", exact: true })
      .click();
    await dialog.getByRole("tab", { name: "Steps", exact: true }).click();
    await dialog
      .getByRole("button", {
        name: "Edit step 1: Synthetic movement",
        exact: true,
      })
      .click();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: globalThis.Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jcXkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await dialog
      .getByRole("button", { name: "Uploading…", exact: true })
      .waitFor({ timeout: 5000 });
    for (const tab of await dialog.getByRole("tab").all())
      if (!(await tab.isDisabled()))
        throw Error("Routine tabs can unmount a pending step upload");
    releaseUpload();
    await dialog
      .getByRole("button", { name: "Save draft", exact: true })
      .waitFor({ timeout: 5000 });
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    await action("Archive");
    await dialog
      .getByRole("button", { name: "Archive routine", exact: true })
      .click();
    await dialog.getByRole("alert").waitFor({ timeout: 5000 });
    if (!(await dialog.isVisible()))
      throw Error("Failed archive dismissed its confirmation");
    fail = false;
    await dialog
      .getByRole("button", { name: "Archive routine", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await action("Restore to draft");
    await dialog
      .getByRole("button", { name: "Restore to draft", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await local
      .getByRole("button", {
        name: "Actions for Synthetic routine",
        exact: true,
      })
      .click();
    await local
      .getByRole("menuitem", { name: "Archive", exact: true })
      .waitFor();
    await local.keyboard.press("Escape");
    if (
      writes.length !== 3 ||
      writes[0].status !== "archived" ||
      writes[1].status !== "archived" ||
      writes[2].status !== "draft"
    )
      throw Error(
        "Archive/retry/restore did not preserve explicit status actions",
      );
    return "Routine lifecycle uses confirmed revision-only archive/restore, retains failed confirmation and has no duplicate editor/delete action";
  } finally {
    releaseUpload?.();
    await context.close();
  }
}
