# Local synthetic website preview

From the isolated copy's `HeartLink-web` folder:

```powershell
npm run preview:synthetic
```

Open **http://127.0.0.1:5181/__preview** and choose Admin, Dietitian, Physical Therapist or Cardiologist. No email or password is needed; do not enter real credentials. `/login` redirects to the chooser. The public landing page remains at `/`.

This runs the actual website UI against invented in-process fixtures, not the application backend. The dedicated Vite configuration disables env-file loading, ignores inherited client API/download settings, has no proxy, binds only to loopback, and restricts browser connections to itself. It refuses builds, production preview mode and host/port overrides. Normal `npm run dev` / `build` do not import this tooling.

Search, filters, view switching, calendars and modal opening work. Saves, uploads, review decisions, archive/publish, Premium/access changes, exports and notification read changes are intentionally unavailable. An attempted write returns an explicit error; nothing is persisted or sent. Role selection/logout only affect a synthetic role cookie. Switching roles reloads the app and clears its in-memory query cache. No health records or real credentials are supplied. Recipes, movements, approvals and amounts are illustrative, not validated recommendations.

This does **not** validate real login, HSS/formulas, database schema compatibility or backend integration. Stop the preview with Ctrl+C. It is not a deployable server or a production authentication mode.

Checks: `npm run test:preview`; browser acceptance in `tests/browser/syntheticPreview.js` uses only this loopback server. No new dependencies are needed.
