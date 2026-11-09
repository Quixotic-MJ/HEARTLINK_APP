// Frontend-only checks: every API is synthetic; service workers and external origins are blocked.
export default async function sharedRefinement(page) {
  const origin = "http://127.0.0.1:5180";
  const context = await page.context().browser().newContext({
    serviceWorkers: "block",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const gates = new Map();
  const releases = new Set();
  const hold = (path) => {
    let finish;
    const promise = new Promise((resolve) => { finish = resolve; });
    gates.set(path, promise);
    const release = () => { gates.delete(path); releases.delete(release); finish(); };
    releases.add(release);
    return release;
  };
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const issues = [], external = [], writes = [];
  let failRead = false, denyActivity = false, denyFeedback = false, denyNotifications = false;
  const notifications = [
    { id: "synthetic-notice", title: "Synthetic workspace notice", message: "A synthetic account notice for testing.", route: null },
    { id: "synthetic-external", title: "Synthetic unavailable destination", message: "A synthetic disallowed destination.", route: "https://example.invalid/unavailable" },
    { id: "synthetic-feedback", title: "Synthetic feedback update", message: "A synthetic report is ready for review.", route: "/feedbacks" },
  ].map((item) => ({ ...item, type: "system", created_at: "2026-11-08T00:00:00Z", read_by: [] }));
  const ticket = {
    id: "synthetic-ticket", ticketId: "FB-101", userId: "synthetic-account",
    status: "Open", category: "Bug Report", fullMessage: "Synthetic navigation feedback.",
    adminNotes: "Synthetic internal note", updated_at: "revision-1", created_at: "2026-11-08T00:00:00Z", date: "Nov 8, 2026",
  };
  const activity = {
    items: [{ id: "synthetic-event", admin_name: "Synthetic Admin", action: "updated", target_type: "recipe", target_name: "Synthetic saved recipe", target_id: "synthetic-reference", created_at: "2026-11-08T00:00:00Z" }],
    total: 1, total_pages: 1, page: 1, page_size: 20, timezone: "Asia/Manila", scope: "Known operational metadata only",
  };
  try {
    await context.addInitScript(() => {
      const NativeEventSource = window.EventSource;
      window.EventSource = class extends NativeEventSource {
        constructor(...args) {
          super(...args);
          (window.syntheticEventSources ??= []).push(this);
        }
      };
    });
    const local = await context.newPage();
    local.on("pageerror", (error) => issues.push(error.message));
    await context.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      const key = url.pathname + url.search;
      if (gates.has(key)) await gates.get(key);
      else if (gates.has(url.pathname)) await gates.get(url.pathname);
      if (url.pathname === "/api/auth/me") return route.fulfill({ json: { user_id: "synthetic-admin", role: "admin", first_name: "Synthetic", last_name: "Admin", email: "synthetic.admin@example.test", account_status: "active" } });
      if (url.pathname === "/api/auth/refresh") return route.fulfill({ json: { success: true, expires_in: 3600 } });
      if (url.pathname.endsWith("/stream")) return route.fulfill({ contentType: "text/event-stream", body: ": synthetic heartbeat\n\n" });
      if (url.pathname === "/api/admin/notifications" && request.method() === "GET") return route.fulfill(denyNotifications ? { status: 403, json: { detail: "Synthetic access denied" } } : { json: { items: notifications, unread_count: notifications.filter((item) => !item.read_by.length).length, total: notifications.length } });
      if (url.pathname.startsWith("/api/admin/notifications/") && request.method() === "PUT") {
        writes.push(url.pathname);
        if (failRead) return route.fulfill({ status: 503, json: { detail: "Synthetic failed read" } });
        for (const item of notifications) {
          if (url.pathname.endsWith("mark-all-read") || url.pathname.endsWith(`/${item.id}/read`)) item.read_by = ["synthetic-admin"];
        }
        return route.fulfill({ json: { success: true } });
      }
      if (request.method() !== "GET") {
        issues.push(`Unexpected mutation ${request.method()} ${url.pathname}`);
        return route.fulfill({ status: 500, json: { detail: "Unexpected synthetic mutation" } });
      }
      if (url.pathname === "/api/admin/activity") return route.fulfill(denyActivity ? { status: 403, json: { detail: "Synthetic access denied" } } : { json: activity });
      if (url.pathname === "/api/admin/activity/export") return route.fulfill({ json: { items: activity.items, count: 1, generated_at: "2026-11-08T00:00:00Z" } });
      if (url.pathname === "/api/feedback/") return route.fulfill(denyFeedback ? { status: 403, json: { detail: "Synthetic access denied" } } : { json: [ticket] });
      issues.push(`Unexpected API ${url.pathname}`);
      return route.fulfill({ status: 500, json: { detail: "Unexpected synthetic API" } });
    });

    const releaseActivity = hold("/api/admin/activity");
    const releaseBell = hold("/api/admin/notifications");
    await local.goto(origin + "/activity-log");
    const main = local.getByRole("main");
    await main.getByRole("status").filter({ hasText: "Loading activity" }).waitFor();
    assert(await main.locator(".skeleton").count(), "Initial activity load has no skeleton");
    assert(await main.getByRole("button", { name: "Export audit CSV", exact: true }).isDisabled(), "Export is available before activity loads");
    const bell = local.getByRole("button", { name: "Notifications", exact: true });
    await bell.focus();
    await local.keyboard.press("Enter");
    const panel = local.getByRole("dialog", { name: "Notifications", exact: true });
    await panel.getByRole("status").filter({ hasText: "Loading notifications" }).waitFor();
    assert(await panel.locator(".skeleton").count(), "Bell has no initial skeleton");
    assert(await panel.evaluate((el) => el === document.activeElement), "Bell opening did not focus its nonmodal panel");
    releaseBell(); releaseActivity();
    await panel.getByRole("button", { name: /Synthetic workspace notice/ }).waitFor();
    await main.getByText("Updated recipe: Synthetic saved recipe", { exact: true }).waitFor();
    await local.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    assert(await bell.evaluate((el) => el === document.activeElement), "Escape did not return focus to the bell");

    const search = main.getByRole("textbox", { name: "Search audit log", exact: true });
    await search.focus();
    await search.evaluate(() => new Promise(requestAnimationFrame));
    const focus = await search.evaluate((el) => ({ input: getComputedStyle(el).outlineStyle, shadow: getComputedStyle(el).boxShadow, wrapper: getComputedStyle(el.parentElement).outlineColor, width: getComputedStyle(el.parentElement).outlineWidth, wrapperStyle: getComputedStyle(el.parentElement).outlineStyle, active: document.activeElement === el, neutral: getComputedStyle(el).getPropertyValue("--color-cal-muted").trim() }));
    assert(focus.input === "none" && focus.shadow === "none" && focus.width === "2px", "Search displays an inner or missing focus boundary: " + JSON.stringify(focus));
    assert(focus.wrapper === "rgb(93, 91, 84)", "Search focus uses the workspace accent instead of neutral gray");
    await local.evaluate(() => document.fonts.ready);
    assert(await search.evaluate((el) => getComputedStyle(el).fontFamily.startsWith('"Instrument Sans"')), "Search does not use Instrument Sans");
    assert(await local.evaluate(() => document.fonts.check('400 14px "Instrument Sans"')), "Self-hosted font did not load");

    const releaseRefresh = hold("/api/admin/activity");
    await main.getByRole("button", { name: "Refresh", exact: true }).click();
    await main.getByRole("status").filter({ hasText: "Updating activity" }).waitFor();
    assert(await main.getByText("Updated recipe: Synthetic saved recipe", { exact: true }).isVisible(), "Refresh removed cached activity");
    assert(await main.locator(".skeleton").count() === 0, "Refresh replaced activity rows with skeletons");
    releaseRefresh();
    await main.getByRole("status").waitFor({ state: "hidden" });
    await main.locator(".activity-reference summary").click();
    await main.getByText("synthetic-reference", { exact: true }).waitFor();
    const download = local.waitForEvent("download");
    await main.getByRole("button", { name: "Export audit CSV", exact: true }).click();
    assert((await download).suggestedFilename().endsWith("2026-11-08.csv"), "Export lost its confirmed generated date");

    const releaseBellRefresh = hold("/api/admin/notifications");
    await bell.click();
    await panel.getByRole("status").filter({ hasText: "Updating notifications" }).waitFor();
    assert(await panel.getByRole("button", { name: /Synthetic workspace notice/ }).isVisible(), "Bell refresh removed cached notifications");
    releaseBellRefresh();
    await panel.getByRole("status").waitFor({ state: "hidden" });
    const releaseLiveRefresh = hold("/api/admin/notifications");
    await local.evaluate(() => window.syntheticEventSources.at(-1).dispatchEvent(new MessageEvent("notifications", { data: "{}" })));
    await panel.getByRole("status").filter({ hasText: "Updating notifications" }).waitFor();
    assert(await panel.getByRole("button", { name: /Synthetic workspace notice/ }).isVisible(), "Live notification refresh removed cached entries");
    releaseLiveRefresh();
    await panel.getByRole("status").waitFor({ state: "hidden" });
    await search.click();
    await panel.waitFor({ state: "hidden" });
    assert(await search.evaluate((el) => el === document.activeElement), "Outside click steals focus back to bell");
    await bell.click();
    await panel.getByRole("button", { name: "View full inbox", exact: true }).focus();
    await local.keyboard.press("Tab");
    await panel.waitFor({ state: "hidden" });

    failRead = true;
    const releaseRead = hold("/api/admin/notifications/synthetic-notice/read");
    await bell.click();
    const notice = panel.getByRole("button", { name: /Synthetic workspace notice/ });
    await notice.click();
    await local.waitForFunction(() => document.querySelector('.notification-panel-item[data-unread="false"]'));
    releaseRead();
    await panel.getByRole("alert").waitFor();
    assert(await notice.getAttribute("data-unread") === "true", "Failed read did not undo optimistic state");
    failRead = false;
    await panel.getByRole("button", { name: /Synthetic unavailable destination/ }).click();
    await panel.getByText("This destination is no longer available for your account.", { exact: true }).waitFor();
    assert(new URL(local.url()).pathname === "/activity-log", "Unsafe notification destination was followed");

    const releaseInbox = hold("/api/admin/notifications?include_archived=true");
    await panel.getByRole("button", { name: "View full inbox", exact: true }).click();
    await main.getByRole("status").filter({ hasText: "Loading notifications" }).waitFor();
    await local.setViewportSize({ width: 375, height: 812 });
    assert(!(await local.evaluate(() => document.documentElement.scrollWidth > innerWidth)), "Inbox skeleton overflows a phone");
    releaseInbox();
    await main.getByRole("heading", { name: "Synthetic workspace notice", exact: true }).waitFor();
    assert(await main.locator(".workspace-metrics, .grid-cols-2.xl\\:grid-cols-4").count() === 0, "Full inbox retains redundant metric blocks");
    await main.getByRole("textbox", { name: "Search notifications", exact: true }).focus();
    const inboxFocus = await main.getByRole("textbox", { name: "Search notifications", exact: true }).evaluate((el) => ({ input: getComputedStyle(el).outlineStyle, width: getComputedStyle(el.parentElement).outlineWidth, wrapper: getComputedStyle(el.parentElement).outline, focused: el === document.activeElement, parent: el.parentElement.outerHTML.slice(0, 120) }));
    assert(inboxFocus.input === "none" && inboxFocus.width === "2px" && inboxFocus.focused, "Inbox search does not share neutral wrapper focus: " + JSON.stringify(inboxFocus));

    await bell.click();
    await panel.getByRole("button", { name: /Synthetic feedback update/ }).click();
    await local.waitForURL(origin + "/feedbacks");
    await main.getByRole("button", { name: "FB-101", exact: true }).waitFor();
    const releaseFeedback = hold("/api/feedback/");
    await bell.click();
    await panel.getByRole("button", { name: "Mark all read", exact: true }).click();
    await main.getByRole("status").filter({ hasText: "Updating feedback" }).waitFor();
    assert(await main.getByRole("button", { name: "FB-101", exact: true }).isVisible(), "Background refresh removed cached feedback");
    releaseFeedback();
    await main.getByRole("status").waitFor({ state: "hidden" });
    await local.keyboard.press("Escape");

    for (const [path, name] of [["/activity-log", "activity"], ["/feedbacks", "feedback"], ["/notifications", "inbox"]]) {
      await local.goto(origin + path);
      await main.getByRole("heading", { level: 2 }).first().waitFor();
      await local.waitForLoadState("networkidle");
      assert(await main.locator(".workspace-metrics").count() === 0, name + " retains metric cards");
      for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 1080 }, { width: 1440, height: 1000 }, { width: 812, height: 375 }]) {
        await local.setViewportSize(viewport);
        assert(!(await local.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${name} overflows ${viewport.width}x${viewport.height}`);
        await local.screenshot({ path: `.tmp/shared-${name}-${viewport.height === 375 ? "landscape" : viewport.width}.png` });
        await bell.click();
        await panel.waitFor();
        const bounds = await panel.boundingBox();
        assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, "Bell exceeds viewport");
        assert(await panel.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration) < 0.001), "Reduced motion does not suppress panel entrance");
        if (viewport.width === 375) await local.screenshot({ path: `.tmp/shared-bell-${name}-phone.png` });
        await local.keyboard.press("Escape");
      }
    }
    await local.emulateMedia({ reducedMotion: "no-preference" });
    await bell.click();
    await panel.waitFor();
    const motion = await panel.evaluate((el) => {
      const style = getComputedStyle(el);
      const keyframes = Array.from(document.styleSheets).flatMap((sheet) => Array.from(sheet.cssRules)).find((rule) => rule.type === CSSRule.KEYFRAMES_RULE && rule.name === style.animationName);
      return {
        duration: style.animationDuration,
        delay: style.animationDelay,
        frames: keyframes && Array.from(keyframes.cssRules).map(({ style }) => ({ transform: style.transform, opacity: style.opacity })),
      };
    });
    assert(motion.duration === "0.14s" && motion.delay === "0s", "Bell entrance is delayed or exceeds 140ms");
    assert(motion.frames?.length && motion.frames.every((frame) => !frame.transform || frame.transform === "none") && motion.frames.some((frame) => frame.opacity === "0"), "Bell entrance is not opacity-only");
    await local.keyboard.press("Escape");
    await local.emulateMedia({ reducedMotion: "reduce" });

    await local.goto(origin + "/feedbacks");
    await main.getByRole("button", { name: "FB-101", exact: true }).waitFor();
    denyFeedback = true;
    await bell.click();
    await panel.getByRole("button", { name: /Synthetic workspace notice/ }).waitFor();
    await panel.getByRole("button", { name: /Synthetic workspace notice/ }).click();
    await main.getByRole("button", { name: "Try again", exact: true }).waitFor();
    assert(await main.getByRole("button", { name: "FB-101", exact: true }).count() === 0, "403 exposes cached feedback");
    await local.keyboard.press("Escape");
    denyFeedback = false;

    await local.goto(origin + "/notifications");
    await main.getByRole("heading", { name: "Synthetic workspace notice", exact: true }).waitFor();
    denyNotifications = true;
    await main.getByRole("button", { name: "Refresh", exact: true }).click();
    await main.getByRole("button", { name: "Try again", exact: true }).waitFor();
    assert(await main.getByRole("heading", { name: "Synthetic workspace notice", exact: true }).count() === 0, "403 exposes cached inbox entries");
    await bell.click();
    await panel.getByText("Unable to load notifications", { exact: true }).waitFor();
    assert(await panel.getByRole("button", { name: /Synthetic workspace notice/ }).count() === 0, "403 exposes cached bell entries");
    await local.keyboard.press("Escape");
    denyNotifications = false;

    await local.goto(origin + "/activity-log");
    await main.getByText("Updated recipe: Synthetic saved recipe", { exact: true }).waitFor();
    denyActivity = true;
    await main.getByRole("button", { name: "Refresh", exact: true }).click();
    await main.getByRole("heading", { name: "Access restricted", exact: true }).waitFor();
    assert(!(await main.getByText("Updated recipe: Synthetic saved recipe", { exact: true }).count()), "403 exposes cached activity");
    assert(issues.length === 0, issues.join("; "));
    assert(external.length === 0, "UI attempted an external request: " + external.join(", "));
    assert(writes.length === 5, "Unexpected notification write count: " + writes.length);
    return ["Initial skeletons, retained activity/feedback/bell/live refreshes, local font and neutral focus passed", "Bell focus/Escape/outside/Tab, optimistic read undo, safe destinations, full inbox and CSV passed", "375/812/1440 and landscape, normal/reduced motion, compact results, denied-refresh hiding and blocked external network passed"];
  } finally {
    for (const release of releases) release();
    await context.close();
  }
}
