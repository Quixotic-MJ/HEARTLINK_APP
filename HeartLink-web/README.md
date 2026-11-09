# HeartLink web portal

General Wellness content and operations portal. Admins author/publish recipes and routines; Dietitians and Physical Therapists review their specialty's exact revisions. Clinical monitoring, case review and model-calibration screens are retired from the active website.

## Structure

```text
src/
  app/                    # Entry, providers, routes, access rules and structure tests
    portalNavigation.js   # Shared permitted page labels/groups and search destinations
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
    search/               # Global page navigation and permitted record-search shortcuts
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

The Playwright checks under `tests/browser/` run separately from `npm test`. Each
exports an async function accepting a Playwright `page` and creates fresh contexts
with synthetic fixtures and API/external interception before navigation. Use an
already authorized Playwright function runner; do not point these tests at a live
backend or reuse signed-in staff data.

Prepare integration work in a separate local copy when the running backend watches
the main checkout. Do not copy `.env` files or start that backend. If reusing an
installed `node_modules` junction, use Vite's `--configLoader native` and a
copy-local `cacheDir` so development/build caches do not modify the source checkout.
Run the function runner from the integration-copy root: screenshots use relative
`.tmp/` paths. Generated evidence is not application source; lint `src` and
`tests/browser` rather than generated build output.

Start only the frontend in a dedicated terminal with this deliberately unreachable
proxy target, then run the exported test functions against port 5180:

```powershell
$env:VITE_API_URL='http://127.0.0.1:5180'
$env:VITE_PROXY_TARGET='http://127.0.0.1:9'
npm run dev -- --host 127.0.0.1 --port 5180 --strictPort
```

| Browser check | Covered behavior |
|---|---|
| `dialogOverlay.js` | Toast/modal/mobile-menu stacking and keyboard focus |
| `recipeSafety.js`, `routineSafety.js` | Confirmed archive/restore, revisions, failure recovery; routine upload lock |
| `recipeMedia.js` | Pending upload/save locks and unconfirmed media responses |
| `contentValidation.js` | Linked/nested validation, phone fields, editor tab keyboard controls |
| `contentDraftExit.js` | Admin and specialty-review draft close/Back/refresh protection |
| `operationalDraftExit.js` | Support-note and announcement navigation/pending protection |
| `staffDraftExit.js` | Provisioning drafts, validation/duplicate lock, failure recovery and synthetic credential handoff |
| `apiErrorSafety.js` | Structured error replies cannot blank forms or echo input payloads |
| `recordedMetadata.js` | Labelled Philippine review dates and truthful unknown-category counts/filters |
| `visualWorkspaces.js` | Gallery/list views, exclusive workflow filters, three-dot menu keyboard/focus, compact labels, aligned footers, two-column previews and responsive archive/draft controls |
| `operationalVisuals.js` | Operational layouts/dialogs, readable Activity typography, row hover and keyboard-accessible references |
| `navigationAndMedia.js` | Four-role global/local search handoff, account Settings shortcut and Sign out menu, responsive shell, photo/video/fallback routine media, keyboard/player controls and no autoplay |
| `libraryRefresh.js` | One-item archive, delayed/failed refetch with retained recipe/routine grid and list content, stale-action locks, explicit retry and initial-load failure |
| `exerciseMetadata.js` | Teammate level/category/body-area/tempo fields round-trip through the current editor and read-only specialist review without changing the movement dose |
| `sharedRefinement.js` | Local font, neutral search focus, loading/refetch indicators, compact operational pages, notification keyboard behavior and denied-cache hiding |
| `premiumConfirmation.js` | Premium add/extend/remove review, zero-write cancellation, pending locks, failure/retry and responsive account dialogs |
| `homeRefinement.js` | Centered landing, date-only Manila calendar on four role-scoped homes, real operational counts and explicitly synthetic analytics previews without health queries |

Stop that dedicated frontend process when finished. Browser fixtures prove UI
behavior, not actual API/database integration, device delivery or release readiness.

Both libraries use the same workflow filter: Drafts are unapproved drafts, Approved
contains approved drafts ready to publish, Published contains published records,
and Archived contains retained archive records. All also keeps unrecognized legacy
statuses visible. There is no second review-status selector. Recipe category/source
facets live under Filters. Card/list lifecycle actions are behind the same three-dot
menu; role and exact-revision requirements are unchanged. Activity references are
expandable without removing their export fields or stored history.

## Navigation and search

The header owns the only global **Search portal** entry (`Ctrl+K` / `Cmd+K`). It
finds permitted pages and offers explicit Recipes, Routines or Accounts search
shortcuts where that role is allowed. A shortcut hands the query to the existing
page filter; it is not a new cross-account/global-record API. Page-local search
stays with its library/table. The global shortcut does not interrupt an active
editor or another dialog.

Sidebar links are grouped into Workspace, Content and Operations using
the same role-filtered page catalogue as the header and search dialog. Account
pages remain in the catalogue for breadcrumbs and portal search, not sidebar links. Empty
groups are omitted. Creation belongs to each page's Add/Create control; duplicate
shell Actions/Quick Create links, the sidebar Search entry and the live clock are
removed. The notification bell opens recent notices and its View full inbox action
opens notification history. Recipe/exercise active accents complement their workspaces
without changing permissions or HeartLink branding.

Content contains Recipes and Exercises; Announcements belongs to Operations.
The footer avatar/name opens the signed-in account's existing Settings page. Its
separate three-dot menu contains only Sign out, retaining the confirmation dialog.
Settings and Notifications are no longer sidebar destinations: use the account
identity link or header bell. Their existing URLs, permissions and portal-search
entries are unchanged.

An archive/save refresh does not replace already loaded library content when a
background read has a service/network failure. Access-denied replies still hide
cached rows. An explicit warning and retry remain visible, and stale
preview/lifecycle actions are blocked until refresh succeeds. A first-load failure
still shows an error, not an empty catalogue. API permission-store service errors
also stay errors rather than silently downgrading staff reads to a filtered public
catalogue. These safeguards do not establish why any particular live request failed.

New website announcement titles allow 60 characters; details belong in the message.
Previously stored titles are not truncated. The backend's existing 80-character
validation and mobile/storage contract remain unchanged.

Exercise list and gallery media share the existing thumbnail/video fields. Native
uploaded videos have controlled playback in the read-only preview; nothing
autoplays. Read-only linked-video previews open on request without an automatic
third-party embed; the existing authoring Media tab is otherwise unchanged.
Missing/failed media gets a neutral fallback. The editor keeps
its original keyboard tab order and reviewed dose. Browser verification uses the
small synthetic codec pattern credited in [tests/fixtures/README.md](tests/fixtures/README.md),
never real user media or a production API.

## Ingredient artwork credits

Ingredient illustrations are unmodified [OpenMoji](https://openmoji.org/) graphics,
release 16.0.0, by HfG Schwabisch Gmund and the OpenMoji contributors, licensed
under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
See `src/assets/ingredients/attribution.txt` for the pinned source. This license
applies to the illustrations, not the application source. Name-based decorative
matching never changes ingredient names, quantities or nutrition; unrecognized
ingredients keep a neutral fallback.

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
