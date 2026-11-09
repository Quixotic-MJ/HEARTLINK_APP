import { dashboard, recipes, exercises, identity } from "../../preview/syntheticFixtures.js";

// Real UI/auth handlers against fully intercepted synthetic responses; no real credentials/backend.
export default async function loginRefinement(page) {
  const origin = "http://127.0.0.1:5182";
  const context = await page.context().browser().newContext({ serviceWorkers: "block", reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  const assert = (value, message) => { if (!value) throw Error(message); };
  const errors = [], external = [], writes = [];
  let mode = "invalid", role = "admin", authenticated = false, release;
  try {
    const local = await context.newPage();
    local.setDefaultTimeout(10000);
    local.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/*", async (route) => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      if (url.pathname === "/api/auth/me") return route.fulfill(authenticated ? { json: identity(role) } : { status: 401, json: { detail: "Synthetic guest" } });
      if (url.pathname === "/api/auth/refresh") return route.fulfill({ status: 401, json: { detail: "Synthetic guest" } });
      if (req.method() !== "GET") writes.push({ path: url.pathname, body: req.postDataJSON() });
      if (url.pathname === "/api/auth/web-login") {
        if (mode === "pending") await new Promise((resolve) => { release = resolve; });
        if (mode === "invalid" || mode === "pending") return route.fulfill({ status: 401, json: { detail: "Invalid credentials" } });
        if (mode === "denied") return route.fulfill({ status: 403, json: { detail: "Access denied" } });
        if (mode === "two-factor") return route.fulfill({ json: { requires_2fa: true, token_2fa: "synthetic-challenge" } });
        authenticated = true;
        return route.fulfill({ json: { ...identity(role), success: true, must_change_password: mode === "password-setup" } });
      }
      if (url.pathname === "/api/auth/web-login/verify-2fa") {
        authenticated = true;
        return route.fulfill({ json: { ...identity(role), success: true } });
      }
      if (url.pathname === "/api/auth/forgot-password") return route.fulfill({ json: { success: true } });
      if (url.pathname.endsWith("/stream")) return route.fulfill({ contentType: "text/event-stream", body: ": synthetic heartbeat\n\n" });
      if (url.pathname.startsWith("/api/admin/notifications")) return route.fulfill({ json: { items: [], total: 0, unread_count: 0 } });
      if (url.pathname === "/api/admin/dashboard") return route.fulfill({ json: dashboard });
      if (url.pathname === "/api/recipes") return route.fulfill({ json: recipes });
      if (url.pathname === "/api/exercises/") return route.fulfill({ json: exercises });
      throw Error("Unexpected synthetic auth request " + req.method() + " " + url.pathname);
    });
    const loginPage = async () => {
      authenticated = false;
      await local.goto(origin + "/login");
      await local.getByRole("heading", { name: "Welcome back.", exact: true }).waitFor();
      await local.waitForLoadState("networkidle", { timeout: 30000 });
    };
    const fill = async () => {
      await local.getByLabel("Email or username", { exact: true }).fill("synthetic@example.test");
      await local.getByLabel("Password", { exact: true }).fill("synthetic-password-only");
    };
    await loginPage();
    assert(!/cardiologist|dietitian|physical therapist|staff portal|administrators|patients sign in/i.test(await local.locator("body").innerText()), "Public login exposes a role roster");
    const visual = await local.locator(".login-visual").boundingBox(), form = await local.locator(".login-form-block").boundingBox();
    assert(visual && form && visual.x + visual.width <= form.x, "Desktop form is not to the right of the visual panel");
    assert(await local.locator("#identifier").getAttribute("autocomplete") === "username", "Password-manager identifier support lost");
    assert(await local.locator("#password").getAttribute("autocomplete") === "current-password", "Password-manager password support lost");
    await local.screenshot({ path: ".tmp/login-desktop.png" });
    await local.getByRole("button", { name: "Sign in", exact: true }).click();
    await local.getByText("Enter your email or username.", { exact: true }).waitFor();
    assert(writes.length === 0, "Invalid empty form reached API");
    await fill();
    await local.getByRole("button", { name: "Show password", exact: true }).click();
    assert(await local.locator("#password").getAttribute("type") === "text", "Password reveal failed");
    await local.getByRole("button", { name: "Hide password", exact: true }).click();
    await local.getByRole("button", { name: "Sign in", exact: true }).click();
    await local.getByRole("alert").getByText("Email, username or password is incorrect", { exact: true }).waitFor();
    assert(await local.locator("#identifier").inputValue() === "synthetic@example.test", "Failed sign-in lost identifier");
    mode = "denied";
    await local.getByRole("button", { name: "Sign in", exact: true }).click();
    await local.getByRole("alert").getByText("This account can't sign in here", { exact: true }).waitFor();
    assert(!/medical experts|patients|administrators/i.test(await local.getByRole("alert").innerText()), "Denied-account message discloses role roster");
    await local.getByRole("button", { name: "Forgot password?", exact: true }).click();
    const dialog = local.getByRole("dialog");
    await dialog.getByRole("heading", { name: "Reset your password", exact: true }).waitFor();
    await dialog.getByLabel("Email or username", { exact: true }).fill("synthetic@example.test");
    await dialog.getByRole("button", { name: "Send instructions", exact: true }).click();
    await dialog.getByText("Request received", { exact: true }).waitFor();
    assert((await dialog.innerText()).includes("If the account matches"), "Recovery account-enumeration protection copy lost");
    await local.keyboard.press("Escape");
    await local.getByRole("button", { name: "Forgot password?", exact: true }).waitFor({ state: "visible" });
    mode = "pending";
    await local.getByRole("button", { name: "Sign in", exact: true }).click();
    await local.getByRole("button", { name: "Signing in…", exact: true }).waitFor();
    assert(await local.getByRole("button", { name: "Signing in…", exact: true }).isDisabled(), "Pending sign-in allows duplicate submit");
    release(); release = null;
    await local.getByRole("button", { name: "Sign in", exact: true }).waitFor();
    mode = "two-factor";
    await local.getByRole("button", { name: "Sign in", exact: true }).click();
    await local.getByRole("heading", { name: "Enter your verification code", exact: true }).waitFor();
    await local.getByLabel("Verification code", { exact: true }).fill("123");
    await local.getByRole("button", { name: "Verify and sign in", exact: true }).click();
    await local.getByText("Enter all 6 digits of the code.", { exact: true }).waitFor();
    assert(await local.locator("#otp").getAttribute("aria-describedby") === "otp-error", "OTP error is not associated with its field");
    await local.getByLabel("Verification code", { exact: true }).fill("001122");
    await local.waitForURL(origin + "/dashboard");
    const otp = writes.find((item) => item.path.endsWith("verify-2fa"));
    assert(otp?.body.token_2fa === "synthetic-challenge" && otp?.body.code === "001122", "Verification payload changed");
    for (const [nextRole, home] of [["admin", "/dashboard"], ["dietitian", "/foods"], ["therapist", "/exercises"], ["cardiologist", "/notifications"]]) {
      mode = "success"; role = nextRole;
      await loginPage(); await fill();
      await local.getByRole("button", { name: "Sign in", exact: true }).click();
      await local.waitForURL(origin + home);
    }
    mode = "password-setup"; role = "admin";
    await loginPage(); await fill();
    await local.getByRole("button", { name: "Sign in", exact: true }).click();
    await local.waitForURL(origin + "/set-password");
    for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }, { width: 900, height: 900 }, { width: 1024, height: 768 }]) {
      await local.setViewportSize(viewport); await loginPage();
      assert(await local.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${viewport.width}`);
      if (viewport.width <= 900) assert(!(await local.locator(".login-visual").isVisible()), "Visual competes with form on narrow screen");
      await local.locator("#identifier").focus();
      assert(await local.locator("#identifier").evaluate((el) => getComputedStyle(el).boxShadow === "none"), "Nested colored input focus remains");
      await local.locator("#identifier").blur();
      if (viewport.width === 375) await local.screenshot({ path: ".tmp/login-phone.png", fullPage: true });
    }
    assert(errors.length === 0, "Browser errors: " + errors.join("; "));
    assert(external.length === 0, "External requests attempted");
    return { roleRosterRemoved: true, splitLayout: true, validationAndErrors: true, recovery: true, pending: true, verification: true, roleHomes: 4, passwordSetup: true, viewports: 5, externalRequests: external.length, pageErrors: errors.length };
  } finally { release?.(); await context.close(); }
}
