# AGENTS.md — HeartLink Mobile

HeartLink is a heart-health companion app, built as a CTU capstone project. Users log blood pressure,
heart rate, symptoms, meals (tracked for sodium), sleep and exercise. The app turns that into a Heart
Health Stability Score (HSS), reacts to what was just logged, and works offline.

It is a supportive wellness tool, **not a diagnostic device**. In any copy, never imply diagnosis,
treatment or clinical certainty. When readings look risky, point the user to an in-person checkup.
Clinics in the app are a public directory with no partnership or endorsement.

The owner is a solo, non-technical developer who tests on a real phone with Expo Go. Explain your
work in plain English (see [Reporting back](#reporting-back)).

---

## Commands

Run these from `HeartLink-mobile/`.

| What | Command |
| --- | --- |
| Install packages | `npm install` (no extra flags needed) |
| Run on a phone | `npx expo start`, then scan the QR code with Expo Go |
| Tests (full suite) | `npx jest` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` (has older errors, see [Known issues](#known-issues)) |

Copy `.env.example` to `.env`. `EXPO_PUBLIC_API_URL` points at the backend. When testing a local
backend on a phone, use the computer's local network IP (e.g. `192.168.x.x`), not `localhost`. Every
`EXPO_PUBLIC_*` value ships inside the app, so never put a secret there.

---

## Tech stack

- Expo ~57, React Native 0.86.3, React 19.2.3, TypeScript (strict)
- Expo Router: file-based routes in `app/`
- NativeWind 4 (Tailwind for React Native) for styling. Colours come from `constants/theme.ts`.
- TanStack Query 5 for server data, with the cache saved to AsyncStorage (`lib/react-query.ts`)
- React Context for app-wide state (`UserContext`, `ToastContext`, `BaselineContext`), local
  `useState` for state inside one component
- `react-hook-form` + `zod` for forms
- `react-native-reanimated` 4 (runs on `react-native-worklets`) for animations, e.g. toasts
- `expo-haptics` for vibration feedback, `expo-secure-store` for auth tokens,
  `@react-native-community/netinfo` for online/offline status
- `expo-speech` for spoken exercise instructions (`hooks/useVoiceGuide.ts`), `expo-keep-awake` to keep
  the screen on during an exercise
- Backend: Python FastAPI + Supabase (PostgreSQL), JWT bearer tokens. The app only talks to the
  FastAPI backend, never to Supabase directly.
- Tests: Jest (`jest-expo` preset) + `@testing-library/react-native` v14, which needs
  `test-renderer` 1.2 (the line that matches React 19.2)

**Ask before adding any library.** Don't add a state library (Zustand, Redux), another styling
system or another navigation library; the current stack is a deliberate choice for an app this size.

---

## Where things go

```
app/              Screens (Expo Router). Groups: (auth), (baseline) = first-run setup,
                  (home)/(tabs|health|meals|profile|settings)
components/ui/    Shared building blocks: Button, ConfirmDialog, Skeleton, InputField, ...
components/...    Feature UI: dashboard/, exercise/, meals/, tabs/
contexts/         UserContext, ToastContext, BaselineContext
hooks/            React Query hooks per action (useLogMeal, useLogExercise, useLogSleep)
services/         API calls and business logic: SyncService, MealLoggingService,
                  companionCopy (postLogAck), companionService
lib/              react-query.ts (QueryClient + persister), secureTokenStore.ts
constants/        theme.ts (colours)
utils/            OfflineSyncService.ts, notifications.ts
```

Screens should put components together and call hooks/services. Keep large reusable UI and business
logic out of screen files.

---

## How to work

1. **Do the task you were given, with the smallest change that correctly fixes it.** This app is
   mid-fix, not mid-rebuild. Don't refactor or tidy nearby code; list it as a follow-up instead.
2. **Follow the patterns below.** Where a section says "current" vs "target", build new code to the
   target, not to whatever older code happens to be nearby.
3. **If a task is ambiguous,** pick the reasonable option, say what you assumed, and carry on.
4. **Ask first** before: adding a library; a new architectural pattern (folders, state, styling);
   changing theme colours/tokens (touches many screens); anything health-safety related you're
   unsure about.
5. **Git:** work on a feature branch. Feature branches merge into `staging` (testing); `main` is
   the live app. Never commit or push without the owner's OK. Commit messages use conventional
   style with the ticket id, e.g. `fix(mobile): show error screen on crash (HL-024)`. Tickets are
   in `documentation/heartlink_update_plan.md` at the repo root. `documentation/` is git-ignored,
   so it exists only in the owner's main checkout, not in worktrees or on GitHub.

---

## Safety rules (non-negotiable)

### Emergency blood pressure
- Any code path that accepts a blood pressure reading must treat these as an emergency and show the
  emergency flow instead of a normal success message:
  - **≥ 180 systolic or ≥ 120 diastolic** (hypertensive crisis)
  - **< 90 systolic or < 60 diastolic** (severe hypotension)
- Reference: `app/(home)/(health)/log-symptoms.tsx`. `isHypertensiveCrisis` and
  `isSevereHypotension` feed `isEmergency`, which opens the emergency guidance modal and shows an
  emergency toast on submit. The same `isEmergency` also fires for chest discomfort rated ≥ 7, or
  shortness of breath while resting.
- `services/companionService.ts` uses the same thresholds for the dashboard warning text. Keep the
  two in sync.
- Never remove, weaken or skip these checks, even if the task doesn't mention safety. If you touch a
  form that takes vitals, confirm the check is there before calling the task done. Don't assume it
  is because another form has it.

### Incomplete health logs
If the user saves a health log with core fields blank (blood pressure, medications), show a soft
warning with `ConfirmDialog` and let them confirm. Don't save silently, and don't block them.
Reference: `showIncompleteWarning` in `log-symptoms.tsx`.

### Secrets and auth
- Auth tokens live only in SecureStore, through `lib/secureTokenStore.ts`. Never put them in
  AsyncStorage, never log them, never hardcode them.
- No API keys or backend secrets in app code.

---

## Patterns

### Fetching data
- **Every call to the HeartLink backend goes through `apiFetch` in `lib/api.ts`** (HL-023):
  `apiFetch("/api/meals/123", { method: "POST", ... })`. It takes the address from
  `EXPO_PUBLIC_API_URL` (`lib/apiBase.ts`, no localhost fallback), adds the saved login token, and on
  a 401 renews the session once and retries; if the session can't be renewed, UserContext signs the
  patient out. Pass `auth: false` for login, sign-up and other calls that must not renew a session.
  It returns a normal `Response`. Never build `${API_URL}/api/...` addresses or call `fetch()` for
  the backend yourself. Plain `fetch` is only for other sites (Open Food Facts) and the refresh call
  in `services/SessionService.ts`.
- **Still to tidy:** `utils/OfflineSyncService.ts` stores full addresses for queued health logs and
  sends them with plain `fetch` (its queue is separate; see Offline support).
- **Target:** new data fetching goes in `services/` or in a React Query hook in `hooks/`
  (`useQuery` / `useMutation`), like `hooks/useLogMeal.ts`. Don't add data fetching to screen
  files. Move an existing one only if you're already changing that logic.

### Offline support
- **Current:** three layers.
  1. The React Query cache is saved to AsyncStorage (`PersistQueryClientProvider` in
     `app/_layout.tsx`).
  2. The logging hooks (`useLogMeal`, `useLogExercise`, `useLogSleep`) update the screen
     straight away (optimistic update), roll back on real errors, and on network or 5xx errors put
     the item in the AsyncStorage queue in `services/SyncService.ts`.
  3. `utils/OfflineSyncService.ts` is a second, separate queue, used by `log-symptoms.tsx`,
     `MissionDropdowns` and `OfflineBanner`.
- **Target:** a new offline-capable action is a `useMutation` hook modelled on `useLogMeal.ts`.
  Don't add another queue. Merging the two queues is its own task; ask first.

### Feedback after an action
- Messages go through `showToast({ title, message, type, duration })` from `ToastContext`, where
  `type` is `"success" | "error" | "info"`.
- After logging something, the message should react to the data just logged (a running total, a
  comparison with the last reading). Build it with `postLogAck()` in `services/companionCopy.ts`.
  Pass the detail text without a trailing full stop, because `postLogAck` adds its own.
- **This is incomplete across the app:** some flows still show the generic fallback line. When
  improving one, check the actual message it produces, not just that it calls `postLogAck`.
- Haptics: call `expo-haptics` directly. There is no shared haptics wrapper (`TactileCard` is a
  local helper inside `trends.tsx` only).

### Dialogs
Use `ConfirmDialog` (`components/ui/ConfirmDialog.tsx`: variants `destructive` / `warning` /
`info`, shown as a bottom sheet or centred) or a custom modal like `QuickLogModal`. Don't add
`Alert.alert()`. A few older screens still use it; replace it only when you're working there.

### Loading states
Use `<Skeleton />` (`components/ui/Skeleton.tsx`) as the placeholder while a screen first loads,
not a spinner. For a button that's busy, use `Button`'s `isLoading` and `loadingText` props.

### Forms
Use `react-hook-form` + `zod` for new forms. Don't write validation by hand.

### Several ways into one feature
Many actions can be reached from more than one button or screen (for example, logging vitals).
Before changing one, trace where each entry point really goes in the code. Don't assume they share
code, or that they don't, and say what you found.

---

## Styling

- Use NativeWind `className` by default.
- Use `StyleSheet` or the `style` prop instead for: `SafeAreaView`, `KeyboardAvoidingView` behaviour
  props, `Modal` props, `Animated.View` and animated values, SVG (e.g. `ScoreRing`),
  platform-specific styles, and values calculated at runtime.
- **Never give `TouchableOpacity` or `Pressable` a dynamic `className`** (template literal or
  ternary). `react-native-css-interop` can crash when it changes. Keep `className` static on these
  and put the changing parts in `style`.

### Colours and design system
- `constants/theme.ts` is the source of truth for the current colours: `Colors.light` /
  `Colors.dark`, plus helpers like `scoreBand()`. The same colours are Tailwind classes
  (`bg-background`, `bg-surface`, `text-text`, `text-text-soft`, `bg-primary`, `text-danger-text`,
  ...) defined as CSS variables in `global.css`.
- **New design direction (decided 2026-10-17):** new or redesigned UI follows
  `documentation/design-system/DESIGN.md` (repo root), with HeartLink's changes in `HEARTLINK.md`, using the
  `ds-*` colour classes and `ds` in `constants/theme.ts` (`useDs()` in `components/onboarding/useDs.ts`
  gives the current light/dark set). The onboarding screens (`app/onboarding.tsx`, `app/(auth)`,
  `app/(baseline)`, `components/onboarding/`) are the reference.
- Use theme colours in new code, not hardcoded hex values. Many older files still hardcode colours;
  don't convert them as a side effect of another task. Move a screen to the new look only when it is
  being redesigned.

### Dark mode
Every new piece of UI must look right in light and dark mode.
- Theme classes like `bg-background` switch automatically (the `.dark` block in `global.css`).
  `dark:` prefixes in `className` are fine too.
- For `style` props, animated values and SVG, use
  `const { colorScheme } = useColorScheme()` from `nativewind`, then
  `const c = colorScheme === "dark" ? Colors.dark : Colors.light`. Many screens call this `isDark`.
  Use NativeWind's `useColorScheme`, as the rest of the app and the Appearance setting do, not the
  one from `react-native` or `hooks/use-color-scheme.ts`.

---

## TypeScript

- Strict mode stays on.
- No `any` in new code. Older files use it; don't spread it. If a type is genuinely unclear, ask.
- Imports are mostly relative (`../services/...`). The `@/` alias works but few files use it.

---

## Testing

- Before writing or changing tests, read the Testing Library docs that ship with the installed
  version: `node_modules/@testing-library/react-native/docs/`, starting with
  `guides/llm-guidelines.md`. Trust them over what you remember; v14 changed a lot.
- In v14, `render`, `renderHook`, `fireEvent` and `act` are async. Always `await` them.
- Shared setup (`jest-setup.js`, `jest.config.js`) affects every test. After changing it, or any
  test, run the full `npx jest`, not just one file.
- Mocks for every test live in `jest-setup.js`: AsyncStorage, `react-native-worklets` (Reanimated's
  native engine, which can't run in Jest), `expo-router`, `expo-haptics`, `expo-status-bar`,
  `expo-speech`, `expo-keep-awake`, `react-native-youtube-iframe`.
- React Query in tests: `retry: false`, `gcTime: Infinity` (otherwise its 5-minute cleanup timer
  keeps Jest running), and no real network calls (mock `fetch`). Today only
  `useLogExercise.test.tsx` uses React Query; when a second test needs it, move this setup into one
  shared helper instead of copying it.
- **Never silence a warning or error without finding its cause.** If hiding it really is right (a
  known, harmless library quirk), say so and explain why.
- If a UI test fails because state "didn't update", check these first: a leftover patch to the test
  renderer or React internals, a missing `await` / `act()`, or un-mocked async work (fetch, timers)
  still running from another test.
- Keep the [Tech stack](#tech-stack) list in sync with what the tests use and mock.

---

## Known issues

Flag these if they get in your way; don't fix them as a side effect of another task.

- `npx tsc --noEmit` shows older errors: test files can't see Jest's types under TypeScript 6, and
  screens that import `global.css` have no type declaration for it.
- `@testing-library/jest-native` is deprecated (Testing Library v14 has the same matchers built in)
  and can be removed along with `react-test-renderer`.
- `useLogMeal.ts` and `useLogSleep.ts` load `SyncService` with a dynamic `import()`, which Jest can't
  run. `useLogExercise.ts` already uses a normal import.
- `.env.example` lists `EXPO_PUBLIC_SUPABASE_*` values the app doesn't use.

---

## Reporting back

- Be short and use plain English.
- Say what changed and exactly how to check it on the phone: which screen, what to tap, what should
  appear.
- Say plainly what you did **not** check, e.g. "I tested the manual log form, not the guided
  workout."
