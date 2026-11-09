// Synthetic editor/reviewer round trip; all API and external requests are intercepted before navigation.
export default async function exerciseMetadata(page) {
  const origin = "http://127.0.0.1:5180";
  let routine = {
    id: "synthetic-metadata-routine", name: "Synthetic metadata routine",
    description: "Synthetic movement instructions", type: "Stationary", intensity: "Low",
    position: "Standing", setting: "Indoors", duration_minutes: 1, rounds: 2, rest_seconds: 10,
    status: "published", expert_validated: true, reviewed_by: "synthetic-pt",
    reviewed_at: "2026-11-09T00:00:00Z", updated_at: "revision-1",
    difficulty_level: "Beginner", category: "Leg movements", target_areas: ["Thighs", "Hips"],
    tempo: "Slow and steady",
    steps: [{ instruction: "Synthetic lift", section: "main", mode: "count", reps: 4,
      seconds_per_rep: 3, duration_seconds: 12, both_sides: true }],
  };
  const writes = [], errors = [];
  let releaseSave;
  for (const role of ["admin", "pt"]) {
    const context = await page.context().browser().newContext({
      serviceWorkers: "block", reducedMotion: "reduce", viewport: { width: 375, height: 812 },
    });
    try {
      const local = await context.newPage();
      local.on("pageerror", (error) => errors.push(error.message));
      await context.route("**/*", async (route) => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        if (url.pathname === "/api/auth/me") return route.fulfill({ json: role === "admin"
          ? { user_id: "synthetic-admin", role: "admin" }
          : { user_id: "synthetic-pt", role: "medical_expert", expert_type: "Physical Therapist" } });
        if (url.pathname === "/api/auth/refresh") return route.fulfill({ json: { success: true, expires_in: 3600 } });
        if (url.pathname.endsWith("/stream")) return route.fulfill({ contentType: "text/event-stream", body: ": synthetic heartbeat\n\n" });
        if (url.pathname.includes("notifications")) return route.fulfill({ json: { items: [], total: 0, unread_count: 0 } });
        if (url.pathname === "/api/exercises/" && request.method() === "GET") return route.fulfill({ json: [routine] });
        if (url.pathname === `/api/exercises/${routine.id}` && request.method() === "PUT" && role === "admin") {
          const body = request.postDataJSON();
          writes.push(body);
          if (body.expectedUpdatedAt !== "revision-1" || body.status !== "draft"
            || body.difficultyLevel !== "Intermediate" || body.category !== "Balance"
            || JSON.stringify(body.targetAreas) !== '["Hips","Balance"]' || body.tempo !== "Three seconds each"
            || body.steps[0].reps !== 4 || body.steps[0].seconds_per_rep !== 3
            || body.steps[0].duration_seconds !== 12 || !body.steps[0].both_sides
            || body.rounds !== 2 || body.restSeconds !== 10 || body.duration !== 1
            || Object.hasOwn(body, "expertValidated")) throw Error("Metadata save lost its revision, fields or reviewed dose");
          if (writes.length === 1) return route.fulfill({ status: 409, json: { detail: "Synthetic metadata save conflict" } });
          await new Promise((resolve) => { releaseSave = resolve; });
          routine = { ...routine, difficulty_level: body.difficultyLevel, category: body.category,
            target_areas: body.targetAreas, tempo: body.tempo, status: "draft", expert_validated: false,
            reviewed_by: null, reviewed_at: null, updated_at: "revision-2" };
          return route.fulfill({ json: routine });
        }
        if (url.pathname === `/api/exercises/${routine.id}/review` && request.method() === "POST" && role === "pt") {
          const body = request.postDataJSON();
          if (body.expectedUpdatedAt !== "revision-2" || body.decision !== "approve"
            || Object.keys(body).sort().join(",") !== "decision,expectedUpdatedAt,note") throw Error("Review changed content or approved a stale revision");
          writes.push(body);
          return route.fulfill({ json: { ...routine, expert_validated: true, reviewed_by: "synthetic-pt", updated_at: "revision-3" } });
        }
        throw Error(`Unexpected metadata request ${request.method()} ${url.pathname}`);
      });
      await local.goto(origin + "/exercises");
      await local.waitForLoadState("networkidle");
      await local.getByRole("button", { name: routine.name, exact: true }).click();
      const dialog = local.getByRole("dialog");
      const expected = role === "admin"
        ? ["Beginner", "Leg movements", "Thighs, Hips", "Slow and steady"]
        : ["Intermediate", "Balance", "Hips, Balance", "Three seconds each"];
      for (const text of expected) await dialog.getByText(text, { exact: true }).waitFor();
      if (role === "admin") {
        await dialog.getByRole("button", { name: "Edit details", exact: true }).click();
        await dialog.getByRole("tab", { name: "Safety", exact: true }).click();
        if (await dialog.locator("#exercise-category option").count() !== 11) throw Error("Incoming category choices are missing");
        await dialog.getByLabel("Level", { exact: true }).selectOption("Intermediate");
        await dialog.getByLabel("Category", { exact: true }).selectOption("Balance");
        await dialog.getByLabel("Body areas it works", { exact: true }).fill(" Hips, , Balance ");
        await dialog.getByLabel("Tempo", { exact: true }).fill("Three seconds each");
        await dialog.getByLabel("Tempo", { exact: true }).scrollIntoViewIfNeeded();
        await local.screenshot({ path: ".tmp/exercise-metadata-editor.png", fullPage: true });
        const save = dialog.getByRole("button", { name: "Save draft", exact: true });
        await save.click();
        await dialog.getByText("Synthetic metadata save conflict", { exact: true }).waitFor();
        if (await dialog.getByLabel("Tempo", { exact: true }).inputValue() !== "Three seconds each") throw Error("Failed save discarded metadata draft");
        await save.click();
        await dialog.getByRole("button", { name: "Saving…", exact: true }).waitFor();
        for (const tab of await dialog.getByRole("tab").all()) if (!(await tab.isDisabled())) throw Error("Pending save allows draft tab changes");
        if (!releaseSave || writes.length !== 2) throw Error("Retry did not retain one pending write");
        releaseSave();
        releaseSave = null;
        await dialog.waitFor({ state: "hidden" });
      } else {
        if (await dialog.getByRole("button", { name: "Edit details", exact: true }).count()) throw Error("Reviewer can edit authored metadata");
        await dialog.getByText("Three seconds each", { exact: true }).scrollIntoViewIfNeeded();
        await local.screenshot({ path: ".tmp/exercise-metadata-review.png", fullPage: true });
        await dialog.getByRole("button", { name: "Approve this revision", exact: true }).click();
        await dialog.waitFor({ state: "hidden" });
      }
      if (await local.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error("Metadata editor overflows phone viewport");
    } finally {
      releaseSave?.();
      releaseSave = null;
      await context.close();
    }
  }
  if (writes.length !== 3 || errors.length) throw Error(`Unexpected metadata writes/errors: ${writes.length}; ${errors.join("; ")}`);
  return "Metadata round trip, failed-save retry, pending locks, unchanged dose and PT exact-revision visibility passed";
}
