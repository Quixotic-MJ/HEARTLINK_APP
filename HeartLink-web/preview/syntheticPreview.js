import { roles, identity, recipes, exercises, dashboard, accounts, staff, tickets, broadcasts, activity, premium, notifications, illustration } from "./syntheticFixtures.js";

export const origin = "http://127.0.0.1:5181";
const cookie = "heartlink_synthetic_role";
const readOnly = "Synthetic preview is read-only. Nothing was saved or sent.";
export const previewStyle = `
@font-face{font-family:PreviewSans;src:url('/fonts/instrument-sans/InstrumentSans-Variable.woff2') format('woff2');font-weight:400 700;font-display:swap}
.synthetic-banner{position:fixed;inset:0 0 auto;z-index:2147483647;height:40px;display:flex;align-items:center;justify-content:center;gap:16px;background:#183b4a;color:white;font:13px PreviewSans,sans-serif;padding:0 12px;box-sizing:border-box}
.synthetic-banner a{color:white;text-decoration:underline;white-space:nowrap}.portal-shell{top:40px!important;height:calc(100dvh - 40px)!important}.portal-sidebar{height:calc(100dvh - 40px)!important}body{padding-top:40px!important}
@media(max-width:1023px){.portal-sidebar{top:40px!important}}
@media(max-width:600px){.synthetic-banner{font-size:11px;gap:8px}.synthetic-banner .preview-detail{display:none}}
`;
const chooser = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HeartLink synthetic preview</title><style>${previewStyle}
*{box-sizing:border-box}body{margin:0;background:#f0f6fa;color:#1b303b;font-family:PreviewSans,system-ui,sans-serif}main{max-width:780px;margin:7vh auto;padding:28px}h1{font-size:clamp(30px,5vw,44px);letter-spacing:-1.4px;margin:12px 0}p{max-width:65ch;line-height:1.6;color:#4c6371}.roles{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:28px 0}form{margin:0}button{width:100%;height:100%;text-align:left;background:white;color:inherit;border:1px solid #cbd9e1;border-radius:14px;padding:22px;cursor:pointer;font:inherit}button:hover{border-color:#245f7c;background:#f8fcff}button:focus-visible,a:focus-visible{outline:2px solid #245f7c;outline-offset:3px}strong{font-size:19px}small{display:block;line-height:1.5;margin-top:8px;color:#4c6371}a{color:#245f7c}@media(max-width:540px){main{margin:2vh auto;padding:20px}.roles{grid-template-columns:1fr}}
</style></head><body><main><img src="/app-icon.svg" width="40" height="40" alt="HeartLink"><h1>Explore the website.</h1><p>This isolated preview uses invented records. Choose a demo role—no email, password or real account needed. You can browse content and open dialogs; saving, publishing and account changes are blocked.</p><div class="roles">${Object.entries(roles).map(([key, role]) => `<form method="post" action="/__preview/session?role=${key}"><button type="submit"><strong>${role.label}</strong><small>${role.description}</small></button></form>`).join("")}</div><p><a href="/">View the public landing page</a></p><p><a href="/__preview/login">View the sign-in design</a></p><small>No backend or database connection. Nothing is saved. Sample recipes and movements are layout placeholders, not health advice.</small></main></body></html>`;

function send(res, status, body, type = "application/json") {
  res.statusCode = status;
  res.setHeader("Content-Type", `${type}; charset=utf-8`);
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}
function redirect(res, location) {
  res.statusCode = 303;
  res.setHeader("Location", location);
  res.end();
}

export function syntheticMiddleware(req, res, next) {
  // No proxy, provider client, credentials or request bodies are consumed here.
  if (req.headers.host !== "127.0.0.1:5181" || (req.headers.origin && req.headers.origin !== origin)) {
    return send(res, 403, { detail: "This preview is available on its loopback origin only." });
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' ws://127.0.0.1:5181; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
  const url = new URL(req.url, origin);
  const path = url.pathname.replace(/\/$/, "");
  const selected = req.headers.cookie?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${cookie}=`))?.slice(cookie.length + 1);
  const role = Object.hasOwn(roles, selected || "") ? selected : null;
  if (path === "/__preview") return send(res, 200, chooser, "text/html");
  if (path === "/__preview/session") {
    const chosen = url.searchParams.get("role");
    if (req.method !== "POST" || req.headers.origin !== origin || !Object.hasOwn(roles, chosen || "")) {
      return send(res, 400, { detail: "Choose a demo role from the preview page." });
    }
    res.setHeader("Set-Cookie", `${cookie}=${chosen}; HttpOnly; SameSite=Strict; Path=/`);
    return redirect(res, roles[chosen].home);
  }
  if (["/login", "/two-factor", "/set-password"].includes(path)) return redirect(res, "/__preview");
  if (path === "/__preview/login" && req.method === "GET") return next();
  if (/^\/__preview\/media\/(recipe|exercise)-[0-3]\.svg$/.test(path)) {
    return send(res, 200, illustration(path.split("/").pop()), "image/svg+xml");
  }
  if (path.startsWith("/__preview") || path === "/static" || path.startsWith("/static/")) {
    return send(res, 404, { detail: "No external or backend media is available in this preview." });
  }
  if (!(path === "/api" || path.startsWith("/api/"))) return next();
  if (path === "/api/auth/logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", `${cookie}=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/`);
    return send(res, 200, { success: true });
  }
  if (!role) return send(res, 401, { detail: "Choose a synthetic role at /__preview. Real credentials are not used." });
  if (path === "/api/auth/refresh" && req.method === "POST") return send(res, 200, { success: true, expires_in: 3600 });
  if (req.method !== "GET") return send(res, 403, { detail: readOnly });
  if (path === "/api/auth/me") return send(res, 200, identity(role));
  if (path === "/api/admin/notifications") return send(res, 200, notifications(role));
  if (path === "/api/admin/notifications/stream") {
    res.setHeader("Content-Type", "text/event-stream");
    res.write(": synthetic preview\n\n");
    const heartbeat = setInterval(() => res.write(": synthetic heartbeat\n\n"), 30000);
    heartbeat.unref();
    res.on("close", () => clearInterval(heartbeat));
    return;
  }
  if (path === "/api/recipes" && ["admin", "dietitian"].includes(role)) return send(res, 200, recipes);
  if (path === "/api/exercises" && ["admin", "therapist"].includes(role)) return send(res, 200, exercises);
  const adminFixtures = {
    "/api/admin/dashboard": dashboard, "/api/users": accounts, "/api/admin/staff": staff,
    "/api/feedback": tickets, "/api/admin/broadcasts": broadcasts, "/api/admin/activity": activity,
    "/api/admin/premium": premium,
  };
  if (role === "admin" && Object.hasOwn(adminFixtures, path)) return send(res, 200, adminFixtures[path]);
  return send(res, role === "admin" ? 501 : 403, { detail: "This endpoint is not available for this synthetic role. No backend request was made." });
}

export function syntheticPreviewPlugin() {
  return {
    name: "heartlink-synthetic-preview",
    configResolved(config) {
      if (config.command !== "serve" || config.isPreview || config.server.host !== "127.0.0.1" || config.server.port !== 5181 || !config.server.strictPort || config.server.proxy || config.server.https) {
        throw Error("Synthetic preview requires dev serve on http://127.0.0.1:5181 with no proxy.");
      }
    },
    configureServer(server) {
      server.middlewares.use(syntheticMiddleware);
      server.middlewares.use(async (req, res, next) => {
        if (new URL(req.url, origin).pathname !== "/__preview/login") return next();
        try {
          const html = await server.transformIndexHtml("/__preview/login", '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HeartLink sign-in design preview</title><style>.login-preview-notice{margin:0;padding:12px 24px;text-align:center;background:#eaf3f9;color:#183e53;font:13px sans-serif}fieldset:disabled .login-page form>button[type=submit]{background:var(--color-cal-primary);color:white}</style></head><body><div id="root"></div><script type="module" src="/preview/loginPreview.jsx"></script></body></html>');
          send(res, 200, html, "text/html");
        } catch (error) { next(error); }
      });
    },
    transformIndexHtml(_html, context) {
      return [
        { tag: "style", children: previewStyle, injectTo: "head" },
        // React Router links otherwise avoid the dev middleware's /login redirect.
        { tag: "script", children: `document.addEventListener('click', (event) => {
          const link = event.target.closest?.('a[href]');
          if (!link) return;
          const target = new URL(link.href, location.href);
          if (target.origin === location.origin && ['/login', '/two-factor', '/set-password'].includes(target.pathname.replace(/\\/$/, ''))) {
            event.preventDefault(); event.stopImmediatePropagation(); location.assign('/__preview');
          }
        }, true);`, injectTo: "head" },
        { tag: "aside", attrs: { class: "synthetic-banner", "aria-label": "Synthetic preview notice" },
          children: context.path === "/__preview/login"
            ? 'Sign-in design · Read-only<span class="preview-detail">Fields disabled · No authentication</span><a href="/__preview">Back to preview</a>'
            : 'Synthetic · Read-only<span class="preview-detail">No real accounts or database</span><a href="/__preview">Switch demo role</a>', injectTo: "body-prepend" },
      ];
    },
  };
}
