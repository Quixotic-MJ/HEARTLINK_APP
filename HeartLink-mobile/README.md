# HeartLink - Mobile Application

The patient app for HeartLink, built with React Native and Expo. Patients log vitals, meals, exercise and sleep, see their Heart Stability Score (HSS) and recommendations, and find nearby clinics. It works offline and syncs when the connection returns.

---

## 🛠️ Tech Stack & Requirements

* **Framework:** Expo SDK 57 (managed workflow), React Native 0.86, React 19
* **Language:** TypeScript (strict)
* **Navigation:** Expo Router (file-based)
* **Styling:** NativeWind (Tailwind for React Native)
* **Data & offline:** TanStack React Query + AsyncStorage
* **Forms:** React Hook Form + Zod
* **Device APIs:** Expo Location, Notifications, Camera, Haptics, Print/Sharing
* **You need:** Node.js 20+, and the Expo Go app on your phone (or an Android/iOS emulator)

Coding rules for this app (styling, safety checks, patterns) are in [AGENTS.md](AGENTS.md).

---

## 📁 Directory Layout

```text
HeartLink-mobile/
├── app/                    # Screens (Expo Router: the folder layout is the navigation).
│   ├── (auth)/             # Login, sign-up, verification code, forgot password.
│   ├── (baseline)/         # The onboarding questions after sign-up (steps 1–6).
│   ├── (home)/
│   │   ├── (tabs)/         # Bottom tabs: dashboard, trends, recipes, exercises, explore, profile.
│   │   ├── (health)/       # Logging vitals and symptoms, exercise sessions, analytics.
│   │   ├── (meals)/        # Meal search, barcode scan, food diary.
│   │   ├── (profile)/      # Profile, care team, notifications.
│   │   └── (settings)/     # Account, reminders, appearance, help.
│   ├── locator.tsx         # Nearby clinic map.
│   └── _layout.tsx         # App start: theme, login check, and redirects.
├── components/             # Reusable UI (dashboard cards, exercise views, buttons, …).
├── contexts/               # Shared state: logged-in user, toasts, baseline answers.
├── hooks/                  # React Query hooks (logging meals, exercise, …).
├── services/               # Talking to the backend and offline sync.
├── constants/theme.ts      # Colors, and the DARK_MODE_ENABLED switch.
├── app.json                # Expo settings (name, icons, startup screen).
└── .env.example
```

## ⚙️ Environment Variables

```bash
cp .env.example .env
```

| Key | What it does | Example |
|-----|--------------|---------|
| `EXPO_PUBLIC_API_URL` | The backend the app talks to | `http://192.168.1.25:8000` (your computer, local) or `https://heartlink-api-production-46db.up.railway.app` (live) |

That's the only setting. The app never talks to Supabase directly.

**Using your own computer's backend:** use your computer's **Wi-Fi IP address**, not `localhost` (on the phone, `localhost` means the phone itself). On Windows, run `ipconfig` and copy the IPv4 Address under Wi-Fi. The backend must be started with `--host 0.0.0.0` (Docker does this for you). Test it by opening `http://<that IP>:8000/health` in your phone's browser.

Sign-up on a local backend uses the code **123456**. The live server uses a private code.

## 🚀 Local Setup

1. Install the packages:
   ```bash
   npm install
   ```
2. Start Expo:
   ```bash
   npx expo start
   ```
3. Open the app:
   * **Phone:** scan the QR code with Expo Go. The phone and computer must be on the **same Wi-Fi**.
   * **Android emulator:** press `a` (with Android Studio running).
   * **iOS simulator (macOS):** press `i`.

If something looks stale, or after changing `app.json` or `.env`, restart with a clean cache:
```bash
npx expo start -c
```

## 🌓 Light and Dark Mode

Dark mode is only partly built, so the app currently **always runs in light mode**, whatever the phone's setting. The switch is `DARK_MODE_ENABLED` in `constants/theme.ts`. Turn it on once every screen has dark styles. (The dark startup screen in `app.json` was removed and should be added back then too.)

## 🧪 Tests & Checks

```bash
npm test             # unit tests (Jest)
npx tsc --noEmit     # type check
npm run lint         # code style
```
`hooks/__tests__/useLogExercise.test.tsx` currently fails to start for an older reason and is being fixed separately.

## 📦 Installable Builds (EAS)

EAS is not set up yet. To make an installable Android build:
```bash
npm install -g eas-cli
eas login
eas build:configure          # creates eas.json, once
eas build -p android --profile preview
```
Set `EXPO_PUBLIC_API_URL` to the live backend for builds that testers install.
