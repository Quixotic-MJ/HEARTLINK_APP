# HeartLink web portal

General Wellness content and operations portal. Admins author/publish recipes and routines; Dietitians and Physical Therapists review their specialty's exact revisions. Clinical monitoring, case review and model-calibration screens are retired from the active website.

## Structure

```text
src/
  app/                    # Entry, providers, routes, access rules and structure tests
  lib/api.js              # Shared cookie/CSRF/refresh-aware HTTP client
  contexts/               # Auth provider and consumer hook
  components/
    layouts/              # Shared authenticated shell, header and sidebar
    ui/                   # Shared input, loading and error views
    modals/               # Shared confirmation dialog
  features/
    recipes/
      recipesPage.jsx
      components/         # Recipe dialog and image UI
      recipeForm.js       # Validation, defaults and form/payload mapping
      recipeForm.test.js
    exercises/            # Routine page, editor UI, form and timeline helpers/tests
    accounts/             # Account/staff page, lists and account dialogs
    broadcasts/           # Publication history and compose/view dialogs
    support/              # Feedback inbox, category badge and ticket dialog
    auth/                 # Login, password setup and logout dialog
    activity/             # Restricted operational history and CSV export
    landing/              # Public website
    notifications/        # Staff inbox and shared header dropdown
    overview/             # Operational overview and deferred-analytics notice
    premium/              # Read-only optional-access/demo overview
    settings/             # Own staff identity and password settings
  hooks/                  # Shared query, dialog-focus and notification lifecycle hooks
  utils/                  # Shared CSV, account-reference and cache helpers
  styles/                 # Shared CSS, tokens and design-system UI
  assets/                 # Existing static assets
  legacy/                 # Unmounted historical clinical/care UI; never import into app
```

Source code filenames and multiword folders use camelCase (`sampleCase`).
Rendered UI uses `.jsx`; hooks, validation, payload mapping and helpers use `.js`.
React component identifiers stay PascalCase. Keep feature-owned dialogs with their feature;
only genuinely shared UI belongs in `components/`. Local display state, focus handling and
small event callbacks can stay in UI files. Substantial reusable data logic belongs in the
feature's form/helper module, not a one-to-one pass-through layer.

Modal overlays and the mobile menu mount at `document.body` with React portals so the
fixed application shell cannot trap them underneath global notifications.

Use exact-case relative imports with explicit extensions. Tests sit next to the behavior
they cover. Existing route URLs (including `/foods`, `/feedbacks`, `/activity-log` and
`/set-password`) are deliberately unchanged.

## Local development and verification

React 19, Vite, React Router, Tailwind CSS, React Query, React Hook Form/Zod, Lucide,
Framer Motion and Sonner are already configured. Use the project's locked dependencies.

```powershell
npm run dev
npm test
npm run lint
npm run build
```

`VITE_API_URL` normally stays empty for same-origin cookie/CSRF behavior.
`VITE_PROXY_TARGET` controls the local `/api` and `/static` proxy. Connect it only to
an explicitly verified isolated backend, never production Supabase. The frontend needs
no Supabase keys. Do not copy credentials into source files or screenshots.

For frontend-only synthetic browser checks, set `VITE_API_URL` to the local frontend
origin and `VITE_PROXY_TARGET` to `http://127.0.0.1:9`, block service workers and
intercept every API/external request before navigation. Unit tests, lint and the build
do not start a backend or execute migrations/seeds. `npm test` also checks exact
on-disk import casing and that no legacy UI is reachable from the browser entry.

`tests/browser/dialogOverlay.js` is a synthetic Playwright function-runner check against
frontend-only port 5180. It verifies toast/modal/menu stacking and keyboard focus; it is
separate from `npm test` and intercepts every API/external request before navigation.

## Roles and limits

- Admin: operational overview/accounts, recipe/routine authoring/publication, support,
  broadcasts, activity export and the secondary read-only Premium demo overview.
- Dietitian: recipe review, own notifications and Settings.
- Physical Therapist: routine review, own notifications and Settings.
- Cardiologist: own notifications and Settings; no clinical records or invented sign-off powers.
- Staff with a temporary password must replace it before entering the portal.

The source/serving/nullable-nutrition contract, revision-linked advisory comments/Admin
replies and direct database/RLS compatibility remain deferred. The existing checkout and
entitlement APIs are preserved; this cleanup adds no payment work. See the canonical
project notes under `Vault/HeartLink/` for acceptance evidence and remaining owner/reviewer gates.

## Release boundary

Work stays on `web_content`. Local verified checkpoints are not releases. Existing
Docker/nginx/Vercel configuration is retained, but no push, merge, deployment, migration,
seed or rollback is authorized by these development commands. Follow `AGENTS.md` and
the vault's branch/recovery guide before any separately approved release operation.
