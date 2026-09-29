# HeartLink - Mobile Application

The cross-platform mobile client for HeartLink, built with React Native and Expo.

---

## 🛠️ Tech Stack & Requirements

* **Framework:** Expo (Managed Workflow)
* **Runtime:** React Native
* **Language:** TypeScript/JavaScript
* **Navigation / Routing:** Expo Router (file-based routing)
* **Styling:** NativeWind / Tailwind CSS
* **State & Query Management:** TanStack React Query + AsyncStorage
* **Forms & Validation:** React Hook Form + Zod
* **Device APIs:** Expo Location, Notifications, Camera, Print/Sharing

---

## 📁 Directory Architecture & Component Responsibilities

```text
HeartLink-mobile/
├── app/                    # The main screens of the app (using Expo Router to handle navigation automatically).
│   ├── (auth)/             # Screens for logging in, registering, and resetting passwords.
│   ├── (tabs)/             # The main bottom navigation tabs (like Dashboard, Logs, and Recipes).
│   └── _layout.tsx         # The master blueprint that dictates how screens transition and stack on top of each other.
├── assets/                 # Visual files like app icons, fonts, and splash screens.
├── components/             # Reusable UI building blocks (like standardized buttons, cards, and text inputs).
├── constants/              # Global design rules (like system-wide colors, fonts, and theme settings).
├── hooks/                  # Custom tools for specific features (like tracking location or fetching vital signs).
├── services/               # The "messengers" that securely talk to the backend server and Supabase.
├── types/                  # The "rulebooks" defining exactly what shapes data should take (TypeScript interfaces).
├── .env.example            # A template showing where developers should put secret API keys.
├── app.json                # The master configuration file for the Expo app (app name, version, icon settings).
├── package.json            # The "recipe book" listing all external code tools the app needs to download to run.
└── README.md               # The manual you are reading right now!
```

## ⚙️ Environment Variables

Create a `.env` file in the root of the `HeartLink-mobile/` directory based on `.env.example`:

```bash
cp .env.example .env
```

| Key | Description | Required | Example |
|-----|-------------|----------|---------|
| `EXPO_PUBLIC_API_URL` | Base URL of the backend API | Yes | `http://192.168.1.XX:8000` (Local) or deployed URL |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Optional | `https://xyz.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key | Optional | `your-anon-key` |

### Example `.env` File

```env
# ==============================================================================
# HeartLink Mobile Environment Configuration (Expo / React Native)
# ==============================================================================

# 1. PRIMARY / BACKUP (Railway)
EXPO_PUBLIC_API_URL=https://heartlink-api-production-46db.up.railway.app

# 3. LOCAL DEVELOPMENT (Must use your computer's local IP address instead of localhost)
# EXPO_PUBLIC_API_URL=http://192.168.1.xxx:8000

# Public Supabase Client (Anon key only)
# IMPORTANT: NEVER place SUPABASE_SERVICE_ROLE_KEY here.
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🚀 Local Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npx expo start
```

### 3. Running on Devices / Emulators
* **Physical Device (Fastest):** Install the **Expo Go** app on Android (Google Play) or iOS (App Store). Scan the QR code shown in your terminal. Ensure your phone and development machine are connected to the same Wi-Fi network.
* **Android Emulator:** Press `a` in your terminal with Android Studio / an AVD running.
* **iOS Simulator (macOS only):** Press `i` in your terminal.
* **Clear Cache (Troubleshooting):**
```bash
npx expo start -c
```

## 🧪 Testing & Linting

```bash
# Run unit and screen tests
npm test

# Check TypeScript types
npx tsc --noEmit
```

## 📦 Building Standalone Binaries (EAS Build)

To package standalone APK / AAB bundles for Android or IPA files for iOS:

### 1. Install EAS CLI & Log In
```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS
```bash
eas build:configure
```

### 3. Generate Android Build (APK for testing)
```bash
eas build -p android --profile preview
```
