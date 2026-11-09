// Local frontend only: synthetic content, intercepted APIs, no backend or provider.
export default async function visualWorkspaces(page) {
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
    const local = await context.newPage();
    const errors = [];
    let writes = 0;
    local.on("pageerror", (error) => errors.push(error.message));
    const recipes = [
      "Garden rice bowl",
      "Herbed chicken",
      "Tomato and beans",
      "Ginger fish",
      "Carrot omelette",
      "Archived recipe",
    ].map((name, index) => ({
      id: `synthetic-recipe-${index}`,
      name,
      category: index % 2 ? "Dinner" : "Lunch",
      servings: 2,
      calories: 220,
      sodium_mg: 120,
      prep_time_minutes: 25,
      difficulty: "Easy",
      status: index === 5 ? "archived" : index === 2 ? "published" : "draft",
      expert_validated: [1, 2].includes(index),
      reviewed_by: [1, 2].includes(index) ? "synthetic-reviewer" : null,
      reviewed_at: [1, 2].includes(index) ? "2026-11-08T01:00:00Z" : null,
      updated_at: "synthetic-revision-1",
      image_url: `/synthetic-dish-${index}.svg`,
      ingredients: [
        { name: "Brown rice", amount: 1, unit: "cup" },
        { name: "Kamatis", amount: 2, unit: "pc" },
        { name: "Bawang", amount: 2, unit: "clove" },
        { name: "Carrot", amount: 1, unit: "pc" },
      ],
      steps: [
        "Prepare the ingredients as recorded.",
        "Follow the reviewed cooking instructions.",
      ],
    }));
    const routines = [
      "Gentle marching",
      "Seated mobility",
      "Breathing focus",
    ].map((name, index) => ({
      id: `synthetic-routine-${index}`,
      name,
      description:
        "Synthetic reviewed movement instructions for layout testing.",
      type: "Stationary",
      intensity: "Low",
      setting: "Indoor",
      position: "Standing",
      duration_minutes: 1,
      media_url: `/synthetic-dish-${index}.svg`,
      status: index === 2 ? "published" : "draft",
      expert_validated: index > 0,
      reviewed_by: index > 0 ? "synthetic-reviewer" : null,
      reviewed_at: index > 0 ? "2026-11-08T01:00:00Z" : null,
      updated_at: "revision-1",
      steps: [
        {
          instruction: "Synthetic movement",
          mode: "time",
          duration_seconds: 30,
        },
      ],
    }));
    await context.route("**/*", (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname.startsWith("/synthetic-dish-")) {
        const palette = [
          "#b8ce85",
          "#d3ab72",
          "#ce7d60",
          "#9cad9b",
          "#e2c260",
          "#a1aaa0",
        ];
        const shade = palette[Number(url.pathname.match(/\d+/)?.[0]) || 0];
        return route.fulfill({
          contentType: "image/svg+xml",
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#e5e7dc"/><ellipse cx="320" cy="220" rx="235" ry="173" fill="#fafaf5"/><ellipse cx="320" cy="220" rx="190" ry="133" fill="${shade}"/><path d="M190 230Q250 100 380 150T440 280Q300 330 190 230" fill="#698356"/><circle cx="270" cy="205" r="37" fill="#d78253"/><circle cx="370" cy="230" r="45" fill="#deab6a"/><circle cx="310" cy="270" r="20" fill="#efe6b0"/><text x="20" y="395" font-family="sans-serif" font-size="14" fill="#4b5b50">Synthetic illustration · layout test</text></svg>`,
        });
      }
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
      if (request.method() !== "GET") {
        writes++;
        return route.fulfill({
          status: 500,
          json: { detail: "Synthetic write not requested" },
        });
      }
      if (url.pathname === "/api/recipes")
        return route.fulfill({ json: recipes });
      if (url.pathname === "/api/exercises/")
        return route.fulfill({ json: routines });
      return route.fulfill({ json: [] });
    });
    await local.goto(origin + "/foods");
    await local
      .getByRole("button", { name: "Garden rice bowl", exact: true })
      .waitFor();
    const grid = local.getByRole("button", { name: "Grid view", exact: true });
    if ((await grid.getAttribute("aria-pressed")) !== "true")
      throw Error("Image gallery is not the default view");
    if ((await local.locator(".library-card").count()) !== 6)
      throw Error("Gallery lost a saved recipe");
    await local
      .getByRole("button", { name: "Add recipe", exact: true })
      .waitFor();
    await local.screenshot({ path: ".tmp/recipe-gallery-desktop.png" });
    const checkWorkflow = async (label, expected) => {
      const group = local.getByRole("group", { name: label, exact: true });
      if (await local.getByLabel(/review status|Publication status/i).count())
        throw Error("Duplicate status/review dropdown remains");
      const search = await local
        .locator(".library-toolbar .workspace-search")
        .boundingBox();
      const viewSwitch = await local
        .getByRole("group", { name: "Library view", exact: true })
        .boundingBox();
      if (
        !search ||
        !viewSwitch ||
        viewSwitch.x >= search.x ||
        search.width < 500
      )
        throw Error(
          "View switch/search do not use the available desktop width",
        );
      for (const [name, count] of expected) {
        const tab = group.getByRole("button", {
          name: new RegExp(`^${name}\\s*${count}$`),
        });
        await tab.focus();
        await local.keyboard.press("Enter");
        await local.waitForFunction(
          (n) => document.querySelectorAll(".library-card").length === n,
          count,
        );
        if ((await tab.getAttribute("aria-pressed")) !== "true")
          throw Error("Workflow keyboard selection was not exposed");
      }
      const inactive = group.getByRole("button", { name: /^Drafts/ });
      const before = await inactive.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      await inactive.hover();
      if (
        (await inactive.evaluate(
          (el) => getComputedStyle(el).backgroundColor,
        )) === before
      )
        throw Error("Workflow lacks the shared hover treatment");
      await group.getByRole("button", { name: /^All/ }).click();
      const trigger = local
        .getByRole("button", { name: /^Actions for / })
        .first();
      await trigger.focus();
      await local.keyboard.press("ArrowDown");
      const menu = local.getByRole("menu");
      await menu.getByRole("menuitem", { name: /^Edit / }).waitFor();
      await local.screenshot({
        path: label.includes("recipes")
          ? ".tmp/recipe-actions-menu.png"
          : ".tmp/exercise-actions-menu.png",
      });
      await local.keyboard.press("End");
      if (
        !(await menu
          .getByRole("menuitem", { name: "Archive", exact: true })
          .evaluate((el) => el === document.activeElement))
      )
        throw Error("Overflow actions do not support keyboard navigation");
      await local.keyboard.press("Escape");
      if (
        !(await trigger.evaluate((el) => el === document.activeElement)) ||
        (await menu.count())
      )
        throw Error("Overflow actions do not close and return focus");
      const reviewSize = await local
        .locator(".library-card-review")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      if (reviewSize > 12) throw Error("Approval labels are not compact");
      if (
        await local
          .locator(".library-card-footer")
          .getByRole("button", { name: /^(Edit|Archive)$/ })
          .count()
      )
        throw Error("Card actions remain inline instead of behind three dots");
      const footers = await local
        .locator(".library-card-footer")
        .evaluateAll((els) =>
          els.slice(0, 3).map((el) => el.getBoundingClientRect().bottom),
        );
      if (Math.max(...footers) - Math.min(...footers) > 2)
        throw Error("Card actions are not aligned in a dedicated footer");
      for (const viewport of [
        { width: 375, height: 812 },
        { width: 812, height: 375 },
      ]) {
        await local.setViewportSize(viewport);
        await trigger.click();
        const bounds = await menu.boundingBox();
        if (
          !bounds ||
          bounds.x < 0 ||
          bounds.y < 0 ||
          bounds.x + bounds.width > viewport.width ||
          bounds.y + bounds.height > viewport.height
        )
          throw Error("Overflow actions are clipped on a small viewport");
        await local.keyboard.press("Escape");
      }
      await local.setViewportSize({ width: 1440, height: 1000 });
    };
    await checkWorkflow("Filter recipes by status", [
      ["Drafts", 3],
      ["Approved", 1],
      ["Published", 1],
      ["Archived", 1],
      ["All", 6],
    ]);
    await local
      .getByRole("article")
      .filter({
        has: local.getByRole("button", {
          name: "Garden rice bowl",
          exact: true,
        }),
      })
      .getByRole("button", {
        name: "Actions for Garden rice bowl",
        exact: true,
      })
      .click();
    await local.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await local
      .getByRole("dialog", { name: "Archive recipe?", exact: true })
      .waitFor();
    await local.screenshot({ path: ".tmp/recipe-archive-dialog.png" });
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 812, height: 375 },
    ]) {
      await local.setViewportSize(viewport);
      const confirm = local
        .getByRole("dialog")
        .getByRole("button", { name: "Archive recipe", exact: true });
      await confirm.focus();
      const bounds = await confirm.boundingBox();
      if (
        !bounds ||
        bounds.y < 0 ||
        bounds.y + bounds.height > viewport.height ||
        (await local.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ))
      ) {
        await local.screenshot({ path: ".tmp/archive-layout-failure.png" });
        throw Error(
          "Archive confirmation obscured: " +
            JSON.stringify({ viewport, bounds }),
        );
      }
      if (viewport.width === 375)
        await local.screenshot({ path: ".tmp/recipe-archive-phone.png" });
    }
    await local.setViewportSize({ width: 1440, height: 1000 });
    await local
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await local.getByRole("button", { name: "List view", exact: true }).click();
    await local.getByRole("table").waitFor();
    await local
      .getByRole("button", { name: "Garden rice bowl", exact: true })
      .click();
    const dialog = local.getByRole("dialog");
    const preview = dialog.getByRole("complementary", {
      name: "Recipe preview",
      exact: true,
    });
    await preview.waitFor();
    if ((await preview.locator(".ingredient-preview-tile").count()) !== 4)
      throw Error("Ingredient illustrations lack names/quantities");
    await local.screenshot({ path: ".tmp/recipe-detail-desktop.png" });
    await dialog
      .getByRole("button", { name: "Edit details", exact: true })
      .click();
    const field = dialog.locator("#name");
    await field.fill("Edited synthetic recipe");
    await preview
      .getByRole("heading", { name: "Edited synthetic recipe", exact: true })
      .waitFor();
    const left = await preview.boundingBox(),
      right = await dialog.locator("form").boundingBox();
    if (!left || !right || left.x + left.width > right.x + 2)
      throw Error("Desktop editor is not two columns");
    await local.screenshot({ path: ".tmp/recipe-editor-desktop.png" });
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 812, height: 375 },
      { width: 1440, height: 1000 },
    ]) {
      await local.setViewportSize(viewport);
      const box = await dialog.boundingBox();
      if (
        !box ||
        box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > viewport.width ||
        box.y + box.height > viewport.height ||
        (await local.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ))
      )
        throw Error("Editor exceeds viewport " + viewport.width);
      await dialog.getByRole("button", { name: "Close", exact: true }).focus();
      await field.focus();
      const fieldBox = await field.boundingBox();
      if (
        !fieldBox ||
        fieldBox.y < 0 ||
        fieldBox.y + fieldBox.height > viewport.height
      )
        throw Error("Focused editor field is obscured");
      if (viewport.width === 375)
        await local.screenshot({ path: ".tmp/recipe-editor-phone.png" });
    }
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    if ((await field.inputValue()) !== "Edited synthetic recipe")
      throw Error("Visual remodel lost a retained draft");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    await local.goto(origin + "/exercises");
    await local
      .getByRole("button", { name: "Gentle marching", exact: true })
      .waitFor();
    if (
      (await local.locator(".library-card").count()) !== 3 ||
      (await local
        .getByRole("button", { name: "Grid view", exact: true })
        .getAttribute("aria-pressed")) !== "true"
    )
      throw Error("Routine gallery lost saved records or default view");
    await checkWorkflow("Filter routines by status", [
      ["Drafts", 1],
      ["Approved", 1],
      ["Published", 1],
      ["Archived", 0],
      ["All", 3],
    ]);
    await local.screenshot({ path: ".tmp/exercise-gallery-desktop.png" });
    await local.getByRole("button", { name: "List view", exact: true }).click();
    await local.getByRole("table").waitFor();
    await local
      .getByRole("button", { name: "Gentle marching", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Edit details", exact: true })
      .click();
    await dialog.getByRole("tab", { name: "Basics", exact: true }).click();
    const routineField = dialog.locator("#name");
    await routineField.fill("Edited synthetic routine");
    const routinePreview = dialog.getByRole("complementary", {
      name: "Routine preview",
      exact: true,
    });
    await routinePreview
      .getByRole("heading", { name: "Edited synthetic routine", exact: true })
      .waitFor();
    const routineLeft = await routinePreview.boundingBox(),
      routineRight = await dialog.locator("form").boundingBox();
    if (
      !routineLeft ||
      !routineRight ||
      routineLeft.x + routineLeft.width > routineRight.x + 2
    )
      throw Error("Routine editor is not two columns");
    await local.screenshot({ path: ".tmp/exercise-editor-desktop.png" });
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 812, height: 375 },
    ]) {
      await local.setViewportSize(viewport);
      await dialog.getByRole("button", { name: "Close", exact: true }).focus();
      await routineField.focus();
      const fieldBounds = await routineField.boundingBox();
      if (
        !fieldBounds ||
        fieldBounds.y < 0 ||
        fieldBounds.y + fieldBounds.height > viewport.height ||
        (await local.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ))
      )
        throw Error("Routine focused field exceeds the viewport");
      if (viewport.width === 375)
        await local.screenshot({ path: ".tmp/exercise-editor-phone.png" });
    }
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Discard draft", exact: true })
      .click();
    if (writes || errors.length)
      throw Error(
        "Visual-only test wrote data or crashed: " + errors.join("; "),
      );
    return "Recipe/routine galleries and lists, recipe approval/card confirmation, two-column live previews/illustrations, responsive field visibility and draft retention passed; no writes";
  } finally {
    await context.close();
  }
}
