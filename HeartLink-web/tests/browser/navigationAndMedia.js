import { SYNTHETIC_ROUTINE_VIDEO } from "../fixtures/syntheticRoutineVideo.js";
// Frontend only: synthetic media/identities, intercepted APIs and blocked external origins.
export default async function navigationAndMedia(page) {
  const origin = "http://127.0.0.1:5180";
  const results = [];
  for (const [role, specialty] of [
    ["admin", null],
    ["medical_expert", "Dietitian"],
    ["medical_expert", "Physical Therapist"],
    ["medical_expert", "Cardiologist"],
  ]) {
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
      const videoBytes = globalThis.Buffer.from(
        SYNTHETIC_ROUTINE_VIDEO,
        "base64",
      );
      const routines = [
        { name: "Photo routine", media_url: "/static/synthetic-cover.svg" },
        {
          name: "Video routine",
          media_url: "/static/synthetic-movement.webm?revision=1",
        },
        {
          name: "Linked routine",
          video_url: "https://www.youtube.com/watch?v=synthetic",
        },
        { name: "Missing media", media_url: "" },
        { name: "Broken image", media_url: "/static/synthetic-missing.svg" },
      ].map((item, index) => ({
        ...item,
        id: `synthetic-routine-${index}`,
        description: "Synthetic movement instructions",
        status: "draft",
        type: "Stationary",
        duration_minutes: 1,
        position: "Seated",
        setting: "Indoor",
        updated_at: "synthetic-revision",
        steps: [
          {
            instruction: "Synthetic movement",
            mode: "time",
            duration_seconds: 30,
          },
        ],
      }));
      await context.route("**/*", (route) => {
        const req = route.request(),
          url = new URL(req.url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname === "/static/synthetic-cover.svg")
          return route.fulfill({
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#d9b9c2"/><circle cx="80" cy="50" r="25" fill="#803746"/></svg>',
          });
        if (url.pathname === "/static/synthetic-movement.webm")
          return route.fulfill({
            contentType: "video/webm",
            body: globalThis.Buffer.from(videoBytes),
          });
        if (url.pathname === "/static/synthetic-missing.svg")
          return route.fulfill({
            status: 404,
            body: "Synthetic missing image",
          });
        if (!url.pathname.startsWith("/api/")) return route.continue();
        if (url.pathname === "/api/auth/me")
          return route.fulfill({
            json: {
              user_id: "synthetic-staff",
              role,
              expert_type: specialty,
              first_name: "Synthetic",
              last_name: "Staff",
              email: "synthetic.staff@example.test",
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
        if (req.method() !== "GET") {
          writes++;
          return route.fulfill({
            status: 500,
            json: { detail: "Unexpected synthetic mutation" },
          });
        }
        if (url.pathname === "/api/exercises/")
          return route.fulfill({ json: routines });
        if (url.pathname === "/api/recipes")
          return route.fulfill({
            json: [
              {
                id: "synthetic-recipe",
                name: "Synthetic recipe",
                status: "draft",
                updated_at: "revision-1",
                ingredients: [],
                steps: [],
              },
            ],
          });
        return route.fulfill({ json: [] });
      });
      const start =
        role === "admin" || specialty === "Physical Therapist"
          ? "/exercises"
          : specialty === "Dietitian"
            ? "/foods"
            : "/notifications";
      await local.goto(origin + start);
      if (await local.getByText("Approved drafts are ready to publish.", { exact: true }).count())
        throw Error("The removed workflow helper is still visible");
      if (start === "/exercises") {
        await local
          .getByRole("button", { name: "List view", exact: true })
          .click();
        await local
          .getByRole("button", {
            name: "Preview media for Photo routine",
            exact: true,
          })
          .waitFor({ timeout: 3000 });
        const media = local.locator(".routine-list-media");
        if ((await media.count()) !== routines.length)
          throw Error("Routine list is missing media slots");
        if (
          (await media.nth(0).locator("img").getAttribute("src")) !==
          origin + "/static/synthetic-cover.svg"
        )
          throw Error("Routine list photo is disconnected");
        const coverVideo = media.nth(1).locator("video");
        await coverVideo.waitFor();
        if ((await coverVideo.getAttribute("autoplay")) !== null)
          throw Error("Routine list autoplays a video");
        await media.nth(1).click();
        const dialog = local.getByRole("dialog"),
          player = dialog.locator(".routine-media video[controls]");
        await player.waitFor();
        await local.waitForFunction(
          () =>
            document.querySelector(".routine-media video[controls]")
              ?.readyState >= 1,
        );
        if (!(await player.evaluate((el) => el.paused)))
          throw Error("Routine preview autoplays");
        if (!(await player.evaluate((el) => el.videoWidth > 0)))
          throw Error("Video fixture has no decoded video track");
        await dialog
          .getByRole("button", { name: "Close", exact: true })
          .focus();
        let reachedVideo = false;
        for (let step = 0; step < 12; step++) {
          await local.keyboard.press("Tab");
          if (await player.evaluate((el) => el === document.activeElement)) {
            reachedVideo = true;
            break;
          }
        }
        if (!reachedVideo)
          throw Error("Native video controls cannot be reached by keyboard");
        await player.evaluate(async (el) => {
          el.loop = true;
          el.currentTime = 0;
          await el.play();
          if (el.paused) throw Error("Explicit video playback did not start");
          el.pause();
          el.loop = false;
        });
        await local.keyboard.press("Control+k");
        if (
          await local
            .getByRole("dialog", { name: "Search portal", exact: true })
            .count()
        )
          throw Error("Global shortcut interrupts an active content dialog");
        await dialog
          .getByRole("button", { name: "Close", exact: true })
          .click();
        await media.nth(2).click();
        await dialog
          .getByRole("link", { name: "Open instructional video", exact: true })
          .waitFor();
        if (await dialog.locator("iframe").count())
          throw Error(
            "Linked video loads an external player before user intent",
          );
        await dialog
          .getByRole("button", { name: "Close", exact: true })
          .click();
        await local.screenshot({
          path: `.tmp/${role === "admin" ? "admin" : "pt"}-exercise-list-media.png`,
        });
      }
      const header = local.locator("header.portal-header"),
        trigger = header.getByRole("button", {
          name: "Search portal",
          exact: true,
        });
      await trigger.waitFor({ timeout: 3000 });
      if (
        (await header.getByRole("textbox").count()) ||
        (await header
          .getByRole("button", { name: "Quick actions", exact: true })
          .count()) ||
        (await local.getByText("Quick Create", { exact: true }).count())
      )
        throw Error("Duplicate global controls remain");
      if (
        await local
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("button", { name: /^Search/ })
          .count()
      )
        throw Error("Sidebar still has a second global search");
      await trigger.click();
      const search = local.getByRole("dialog", {
        name: "Search portal",
        exact: true,
      });
      const input = search.getByRole("combobox", {
        name: "Search pages and permitted records",
        exact: true,
      });
      await input.fill("synthetic query");
      const options = await search.getByRole("option").allTextContents();
      const expected =
        role === "admin" ? 3 : specialty === "Cardiologist" ? 0 : 1;
      if (options.length !== expected)
        throw Error(
          "Global record shortcuts cross a role boundary or omit a permitted library",
        );
      if (
        (specialty === "Dietitian" && !options[0].includes("recipes")) ||
        (specialty === "Physical Therapist" && !options[0].includes("routines"))
      )
        throw Error("Expert search points at the wrong specialty");
      await local.keyboard.press("Escape");
      if (!(await trigger.evaluate((el) => el === document.activeElement)))
        throw Error("Global search did not restore focus");
      if (expected) {
        await trigger.click();
        await input.fill("synthetic query");
        await local.keyboard.press("Enter");
        await search.waitFor({ state: "hidden" });
        const url = new URL(local.url());
        if (
          url.pathname !== start ||
          url.searchParams.get("search") !== "synthetic query"
        )
          throw Error(
            "Global shortcut is not connected to the selected library filter",
          );
        const localSearch = local.locator("main .workspace-search input");
        await local.waitForFunction(
          (query) =>
            document.querySelector("main .workspace-search input")?.value ===
            query,
          "synthetic query",
        );
        if ((await localSearch.inputValue()) !== "synthetic query")
          throw Error("Page search did not receive the global query");
        await localSearch.fill("Photo");
        if (new URL(local.url()).pathname !== start || (await search.count()))
          throw Error("Local filtering opened global navigation");
      }
      await header
        .getByRole("button", { name: /^(Toggle|Expand) sidebar$/ })
        .click();
      await local.waitForFunction(
        () =>
          document.querySelector(".portal-sidebar")?.getBoundingClientRect()
            .width === 72,
      );
      await local.setViewportSize({ width: 375, height: 812 });
      await header
        .getByRole("button", { name: /^(Toggle|Expand) sidebar$/ })
        .click();
      const mobileMenu = local.getByRole("dialog", {
        name: "Main menu",
        exact: true,
      });
      await mobileMenu.waitFor();
      if ((await mobileMenu.boundingBox())?.width !== 240)
        throw Error("Desktop collapse leaves the mobile sidebar compressed");
      await mobileMenu
        .getByRole("link", { name: "Settings", exact: true })
        .waitFor();
      await local.keyboard.press("Escape");
      await mobileMenu.waitFor({ state: "hidden" });
      await local.setViewportSize({ width: 1440, height: 1000 });
      await header
        .getByRole("button", { name: /^(Toggle|Expand) sidebar$/ })
        .click();
      for (const viewport of [
        { width: 375, height: 812 },
        { width: 812, height: 375 },
        { width: 1440, height: 1000 },
      ]) {
        await local.setViewportSize(viewport);
        await local.keyboard.press("Control+k");
        await search.waitFor();
        await input.fill("settings");
        await search.getByRole("option", { name: /Settings/ }).waitFor();
        if (
          await local.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error("Portal search overflows the viewport");
        if (viewport.width === 375)
          await local.screenshot({
            path: `.tmp/portal-search-${specialty || role}-phone.png`,
          });
        await local.keyboard.press("Escape");
      }
      await local.setViewportSize({ width: 1440, height: 1000 });
      const sidebar = local.locator(".portal-sidebar"),
        accountSettings = sidebar.getByRole("link", { name: "Account settings", exact: true }),
        accountTrigger = sidebar.getByRole("button", { name: "Account menu", exact: true }),
        accountMenu = sidebar.getByRole("menu", { name: "Account menu", exact: true });
      await accountSettings.click();
      await local.waitForURL(origin + "/settings");
      await local.getByRole("heading", { name: "Settings", exact: true }).waitFor();
      await accountTrigger.focus();
      await local.keyboard.press("Enter");
      await accountMenu.waitFor();
      if (JSON.stringify(await accountMenu.getByRole("menuitem").allTextContents()) !== JSON.stringify(["Sign out"]))
        throw Error("Account menu duplicates navigation or loses Sign out");
      await local.keyboard.press("Escape");
      if (!(await accountTrigger.evaluate((el) => el === document.activeElement)))
        throw Error("Account menu did not restore keyboard focus");
      await accountTrigger.click();
      await accountMenu.getByRole("menuitem", { name: "Sign out", exact: true }).click();
      const signOut = local.getByRole("dialog", { name: "Sign out of HeartLink?", exact: true });
      await signOut.getByRole("button", { name: "Cancel", exact: true }).click();
      if (new URL(local.url()).pathname !== "/settings")
        throw Error("Cancelling Sign out navigates away from Settings");
      await local.setViewportSize({ width: 375, height: 812 });
      await header.getByRole("button", { name: /^(Toggle|Expand) sidebar$/ }).click();
      await sidebar.getByRole("link", { name: "Account settings", exact: true }).click();
      await local.waitForFunction(() => document.querySelector(".portal-sidebar")?.inert);
      await header.getByRole("button", { name: /^(Toggle|Expand) sidebar$/ }).click();
      await accountTrigger.click();
      const bounds = await accountMenu.boundingBox();
      if (!bounds || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > 375 || bounds.y + bounds.height > 812)
        throw Error("Account menu exceeds the phone viewport");
      await local.screenshot({ path: `.tmp/account-footer-${specialty || role}-phone.png` });
      if (writes || errors.length)
        throw Error(
          "Read-only shell/media checks wrote data or crashed: " +
            errors.join("; "),
        );
      results.push(
        `${specialty || role}: role-safe global/local search and shell${start === "/exercises" ? ", photo/video list and controlled media preview" : ""} passed`,
      );
    } finally {
      await context.close();
    }
  }
  return results;
}
