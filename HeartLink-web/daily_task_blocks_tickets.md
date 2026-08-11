# HeartLink Project Tickets (Workflow Format)

This document adapts the 20-Day Sprint into actionable "Tickets" that fit a real-world Git workflow (Feature Branch -> Staging -> Main).

**🔄 Workflow Reminder for Every Ticket:**
1. **Branch Out:** `git checkout staging` -> `git checkout -b feature/[branch-name]`
2. **Code & Commit:** `git add .` -> `git commit -m "completed [feature]"` -> `git push origin feature/[branch-name]`
3. **Review & Merge:** Open a PR to merge into `staging`. Review your code, check for console logs, and merge.
4. **QA Test:** Switch back to staging locally (`git checkout staging` -> `git pull origin staging`) and test thoroughly as a "QA Tester".

---

## 📱 Phase 1: Mobile App Core Logic & Flow (Mock DB)
*Goal: Ensure the mobile app can perform all core actions and logic using the existing FastAPI mock backend.*

### Ticket 1: Advanced Auth Flow & OTP
**Branch:** `feature/auth-flow`
**Status:** [ ] To Do | [ ] In Progress | [x] QA | [] Done
**Description:** Connect the existing UI screens to the backend authentication endpoints and manage the user session using local storage.
**Tasks:**
- [x] **Login Screen (`login.tsx`)**
  - [x] Add Form validation (ensure email/phone and password are not empty before submitting).
  - [x] Connect the submit button to `POST /api/auth/login`.
  - [x] Add a loading spinner state while waiting for the backend response.
  - [x] Display inline error messages (e.g., "Invalid Credentials") on API failure.
- [x] **Registration Screen (`register.tsx`)**
  - [x] Add Form validation (email format, phone format, password strength).
  - [x] Connect the submit button to `POST /api/auth/request-code`.
  - [x] On success, auto-navigate to the `verify-otp.tsx` screen, passing the phone/email via route params.
- [x] **OTP Verification (`verify-otp.tsx` & `verification-success.tsx`)**
  - [x] Connect the OTP input to `POST /api/auth/verify-code`.
  - [x] Implement a countdown timer for "Resend Code" (e.g., 60 seconds).
  - [x] Connect "Resend Code" button to `POST /api/auth/resend-code`.
  - [x] On successful verification, show `verification-success.tsx`, then navigate to Onboarding.
- [x] **Session & State Management**
  - [x] On successful Login/OTP verification, save the returned `user_id` to `AsyncStorage`.
  - [x] Create an Auth check: If `user_id` exists in `AsyncStorage` on app load, bypass the Auth screens.
  - [x] Implement a "Logout" function that clears `AsyncStorage` and navigates back to Login.

### Ticket 2: The "Baseline" Onboarding Flow
**Branch:** `feature/baseline-onboarding`
**Status:** [ ] To Do | [ ] In Progress | [x] QA | [] Done
**Description:** Implement the multi-step onboarding process, collecting user health data and saving it step-by-step to the backend.
**Tasks:**
- [x] **State Management:** Pass `user_id` across onboarding screens using route parameters.
- [x] **Biometrics (`core_biometrics.tsx`, `clinical_biometrics.tsx`)**
  - [x] Add inputs for Height, Weight, Blood Pressure, and ensure number-only validation.
  - [x] Save biometrics step-by-step to the backend (e.g., `POST /api/users/{user_id}/baseline/core`).
- [x] **Lifestyle (`dietary_profile.tsx`, `lifestyle_habits.tsx`, `health_goals.tsx`)**
  - [x] Implement selectable pills/checkboxes for dietary restrictions and goals.
  - [x] Validate that at least one goal is selected before proceeding.
  - [x] Save lifestyle choices to the backend (e.g., `POST /api/users/{user_id}/baseline/lifestyle`).
- [x] **Transition (`calculating.tsx`)**
  - [x] Display the "Calculating your profile..." animation on `calculating.tsx` for 3 seconds.
  - [x] Navigate to the main dashboard (`(tabs)`) after the animation completes.

### Ticket 3: Main Tabs UX Polish (Dashboard, Record, & Wrap-up)
**Branch:** `feature/main-tabs-ux`
**Status:** [ ] To Do | [ ] In Progress | [x] QA | [] Done
**Description:** Refine the core dashboard and logging screens with offline caching, optimistic UI, and actionable insights.
**Tasks:**
- [x] **Tab Navigation (`(tabs)/_layout.tsx`)**
  - [x] Ensure routing between Dashboard, Recipes, Exercises, and Wrap-up tabs with active/inactive states.
- [x] **Dashboard Offline UX (`dashboard.tsx`)**
  - [x] Fetch the current user's data on component mount and via pull-to-refresh.
  - [x] Implement Local Caching: Store the last fetched dashboard data in `AsyncStorage`.
  - [x] If `GET /api/dashboard/me` fails, load the cached data and show an "Offline - Showing last updated score" banner.
- [x] **Data Entry Friction (`record.tsx`, `log-symptoms.tsx`)**
  - [x] Implement sliders/selectors and connect to `POST /api/health_logs/record`.
  - [x] Add Haptic Feedback (`expo-haptics`) to all sliders and the save button.
  - [x] Implement Optimistic UI: Immediately show success state and return to dashboard on "Save", running the API request silently in the background.
- [x] **Actionable Wrap-up (`wrap-up.tsx`)**
  - [x] Fetch today's completed tasks and logged metrics.
  - [x] Add contextual insights: If score dropped, highlight the specific negative input (e.g., "High sodium logged"). If improved, provide positive reinforcement based on logged behavior.

### Ticket 4: Advanced Meal Tracking (Barcode & Estimation)
**Branch:** `feature/meal-tracking`
**Status:** [ ] To Do | [] In Progress | [x] QA | [] Done
**Description:** Implement meal logging capabilities including real barcode scanning via OpenFoodFacts and manual entry search.
**Tasks:**
- [x] **Barcode Scanner (`barcode-scan.tsx`)**
  - [x] Implement camera permissions check using Expo Camera.
  - [x] Integrate OpenFoodFacts API to fetch real product data on successful barcode scan.
  - [x] Navigate to the meal details page with the scanned food data.
- [x] **Manual Entry (`search-meal.tsx`, `estimate-meal.tsx`)**
  - [x] Add a search input with debounce that queries `GET /api/meals/search`.
  - [x] Render the search results in a list.
  - [x] Allow user to tap an item, adjust portion sizes, and log the meal.
- [x] **Recipes Tab (`recipes.tsx`, `recipe-details.tsx`)**
  - [x] Render recommended recipes.
  - [x] Connect the recipe card tap to open the full `recipe-details.tsx` screen.

### Ticket 5: Exercise, Clinics, Settings, & Reminders
**Branch:** `feature/app-extras`
**Status:** [ ] To Do | [ ] In Progress | [x] QA | [] Done
**Description:** Wire up the remaining auxiliary screens and wrap up Phase 1 logic.
**Tasks:**
- [x] **Exercises (`exercises.tsx`, `exercise-deqtails.tsx`)**
  - [x] Fetch recommended workouts, apply "Waterfall" CSS tier filtering, and implement horizontal scrollable Category Pill filters.
  - [x] Integrate `expo-speech` and build NLP Smart Pacing logic to dynamically adjust voice coaching delays based on instruction text.
  - [x] Implement a dynamic infinite-loop Voice Coach and perfectly synchronized pulsing breathing animation for "Breathing" exercises.
  - [x] Add gamification badges, interactive step highlighting, percentage-based encouragement (50%, 75%), and haptic feedback.
  - [x] Implement a zero-friction "End Session" flow that hits `POST /api/exercises/logs/{user_id}` and routes to safety checks.
- [x] **Care Team (`care-team.tsx`)**
  - [x] Fetch the user's assigned clinic/doctor data from `GET /api/clinics`.
  - [x] Wire up the "Call" or "Email" buttons using React Native's `Linking` API (`tel:` and `mailto:`).
- [x] **Settings Suite**
  - [x] Wire up `account-security.tsx` (Change Password functionality).
  - [x] Wire up `appearance.tsx` (Toggle between Light/Dark mode globally).
  - [x] Wire up `daily-reminders.tsx` (Save notification preferences locally).
- [x] **Phase 1 Final Walkthrough:** Run through the entire app using the mock DB to ensure no dead ends exist.

---

## ✨ Phase 2: Mobile User Experience (UX) Polish
*Goal: Make the mobile app look and feel premium, responsive, and error-proof.*

### Ticket 6: UI Consistency (Empty States & Skeletons)
**Branch:** `feature/ux-consistency`
**Status:** [ ] To Do | [ ] In Progress | [x] QA | [] Done
**Description:** Standardize the app's visual placeholders for empty data and loading states.
**Tasks:**
- [x] Analyze the app for screens needing loading skeletons (analysis completed).
- [x] Standardize empty states across 7 key screens (Daily Diary, Care Team, Recipes, etc.) with a highly reusable `<EmptyState />` component.
- [x] Implement a reusable `<Skeleton />` component.
- [x] Add skeleton states to `dashboard.tsx` while fetching the Cardio Score.
- [x] Add skeleton lists to `recipes.tsx` and `exercises.tsx` while fetching items.
- [x] Ensure image placeholders load gracefully before the actual images render.

### Ticket 7: Global Toast System & Error Handling
**Branch:** `feature/ux-error-handling`
**Status:** [ ] To Do | [ ] In Progress | [x] QA | [] Done
**Description:** Ensure the app handles notifications, edge cases, and errors gracefully.
**Tasks:**
- [x] Build and integrate a global `<ToastProvider />` using `react-native-reanimated`.
- [x] Replace intrusive `Alert.alert` dialogs for success/error messages across 15+ screens. (Also implemented Centralized ConfirmDialogs for all destructive actions).
- [x] Fix Header notification icon to dynamically fetch unread status instead of hardcoding the red dot.
- [x] Create a global `<OfflineBanner />` component that appears when `NetInfo` detects no internet.
- [x] Implement global `fetchAPI` wrapper hook to catch 401/500 errors and show a generic "Something went wrong" toast (since we use fetch instead of axios).
- [x] Strengthen Baseline Onboarding forms (e.g., prevent negative weights, enforce max BP values).

### Ticket 8: Animations & Micro-interactions
**Branch:** `feature/ux-animations`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [x] Done
**Description:** Add polish that makes the app feel "alive".
**Tasks:**
- [x] Use `react-native-reanimated` to add staggered entrance animations to cards in Dashboard, Exercises, and Recipes.
- [x] Refactor `ConfirmDialog` and `InputField` to use `react-native-reanimated` for smooth layout transitions and shake effects.
- [x] Add haptic feedback (`expo-haptics`) to major interactions (Buttons, Toast Notifications).
- [x] Tune Toast notification spring physics for a punchier feel.

### Ticket 9: Responsive Design Testing
**Branch:** `feature/ux-responsive`
**Status:** [ ] To Do | [ ] In Progress | [x] QA | [] Done
**Description:** Ensure UI scales perfectly across all device sizes.
**Tasks:**
- [x] Increase touch targets (Quick Actions, filter chips, dialog buttons) to meet 44x44px minimum for mobile accessibility.
- [x] Apply max-width constraints to main screens to prevent horizontal stretching on Tablet/Desktop.
- [x] Implement responsive wrapping grids for Recipe and Exercise lists on larger screens.

---

## 💻 Phase 3: Web Portal (Clinical & Admin) Polish
*Goal: Build out and polish the web portal using mock data.*

### Ticket 10: Web Auth & Analytics Dashboard
**Branch:** `feature/web-auth-dashboard`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [x] Done
**Description:** Establish the web application architecture, robust authentication, and dynamic analytics dashboard using Recharts.
**Tasks:**
- [x] **Web Authentication:** Build the admin login form, connect to `POST /api/auth/web-login`, and implement session management utilizing the `AuthContext`.
- [x] **Application Layout:** Construct a persistent, responsive `AdminLayout` wrapper encompassing a unified sidebar and header system for internal routing.
- [x] **Analytics Integration:** Develop the main overview dashboard connected to `GET /api/analytics/system_metrics`.
- [x] **Data Visualization:** Integrate `Recharts` to render real-time interactive line charts, area charts, and bar charts for cardiovascular stability scores and system active users.

### Ticket 11: Case Review & ML Calibration History
**Branch:** `feature/case-review-calibration`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [x] Done
**Description:** Build the clinical interface for Medical Experts to review patient cases, submit ground-truth CSS ratings, and calibrate the Machine Learning model.
**Tasks:**
- [x] **Case Review UI:** Build an interface to fetch and display pending patient cases using `GET /api/admin/pending_cases`.
- [x] **Expert Evaluation:** Implement a rating submission form where experts assign a Cardiovascular Stability Score (CSS), clinical notes, and recommendations.
- [x] **Calibration History:** Create a historical log of evaluated cases comparing the Expert CSS against the ML-generated CSS to monitor dataset drift.
- [x] **Submission Integrity:** Refactor the UI to lock evaluations after submission and remove duplicate submit buttons, ensuring the integrity of the ML training dataset.
- [x] **Architecture Cleanup:** Remove legacy Alert Monitoring infrastructure to tightly focus the portal on the Baseline Calibration feature.

### Ticket 12: Management, ML Calibration Fixes, & RBAC
**Branch:** `feature/web-management-rbac`
**Status:** [ ] To Do | [x] In Progress | [ ] QA | [ ] Done
**Description:** Fortify the web portal with enterprise-grade Role-Based Access Control (RBAC), fix Machine Learning pipeline leakage, and finalize the User Management system.
**Tasks:**
- [x] **Machine Learning Pipeline Protection:** Patch the Case Calibration flow so that `Archived` evaluations are strictly ignored by the `train_model.py` dataset, preventing data leakage.
- [x] **User Management & API Integration:** Connect the System Staff UI to `GET /api/admin/staff`. Wire up the "Revoke Access" / "Restore Access" buttons to hit `PUT /api/admin/users/{user_id}/status`.
- [x] **Role-Based Access Control (RBAC):** Implement a strict route guard in `AdminLayout.jsx` that intercepts and forcefully redirects non-admin roles (e.g., Medical Experts) who attempt to bypass the UI via direct URLs.
- [x] **Dynamic Session UI:** Update `sidebar.jsx` to completely strip out the "System" and "Management" menu tabs for Medical Experts, and populate the bottom profile strip with the actual authenticated user's data.
- [x] **Backend Authentication Sync:** Verify and sync the Uvicorn backend `mock_profiles.json` to ensure Medical Experts can successfully log into the protected portal.

### Ticket 13: Web UX Polish
**Branch:** `feature/web-ux-polish`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [ ] Done
**Description:** Ensure the web portal feels professional and responsive.
**Tasks:**
- [ ] Add standard "Toast" notifications (using `react-hot-toast` or similar) for all CRUD success/error actions.
- [ ] Ensure the Clinical Portal table is responsive on smaller laptop screens (horizontal scrolling or collapsing columns).
- [ ] Add empty states for tables (e.g., "No patients found matching your search").

---

## ⚙️ Phase 4: Database Migration & ML Integration
*Goal: Swap out mock_db.py for a real database and finalize ML.*

### Ticket 14: Real Database Setup
**Branch:** `feature/db-setup`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [ ] Done
**Description:** Transition from the Python-based mock list to a production-ready database.
**Tasks:**
- [ ] **Provisioning:** Spin up a real database instance (e.g., PostgreSQL on Supabase, or MongoDB).
- [ ] **ORM Configuration:** Setup SQLAlchemy (or Prisma/Motor) in the FastAPI backend to connect to the new DB.
- [ ] **Schema Creation:** Translate the mock profile and log structures into formal DB tables/collections.

### Ticket 15: Auth & Baseline DB Migration
**Branch:** `feature/db-auth-migration`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [ ] Done
**Description:** Move the core user authentication endpoints to the real database.
**Tasks:**
- [ ] Update `/api/auth` (Request Code, Verify Code, Login) to read/write from the real `Users` table.
- [ ] Implement real password hashing (e.g., bcrypt) if storing passwords.
- [ ] Update `/api/profile/baseline` to insert real rows into the database instead of appending to `mock_db.py`.

### Ticket 16: Content DB Migration (Meals, Recipes, Clinics)
**Branch:** `feature/db-content-migration`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [ ] Done
**Description:** Move all auxiliary data fetching and logging to the real database.
**Tasks:**
- [ ] Migrate `GET /api/meals`, `POST /api/meals/log` to use the DB.
- [ ] Migrate `GET /api/exercises`, `GET /api/recipes`.
- [ ] **The Purge:** Completely remove `mock_db.py` from the project. Verify all tests and API endpoints still run.

### Ticket 17: Machine Learning Integration
**Branch:** `feature/ml-integration`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [ ] Done
**Description:** Connect the real database data to the Random Forest model.
**Tasks:**
- [ ] Ensure `rf_model.pkl` loads correctly on backend startup.
- [ ] Write a service function that takes a User's real DB records (latest BP, diet, logs) and feeds it into the ML model to generate the Cardiovascular Stability Score.
- [ ] Ensure the backend automatically updates this score in the DB when a new log is submitted.

### Ticket 18: Landing Page Polish
**Branch:** `feature/landing-page`
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [ ] Done
**Description:** Finalize the marketing site.
**Tasks:**
- [ ] Replace placeholder texts with final, polished marketing copy.
- [ ] Replace placeholder images with actual screenshots taken from the iOS/Android simulator.
- [ ] Verify the landing page is mobile-responsive and test all CTA buttons (e.g., "Download on the App Store").

### Ticket 19: Pre-Launch QA (End-to-End Testing)
**Branch:** `staging` *(Test on staging before PR to main)*
**Status:** [ ] To Do | [ ] In Progress | [ ] QA | [ ] Done
**Description:** The final validation before production launch.
**Tasks:**
- [ ] **End-to-End Mobile:** Register -> Onboard -> See real Cardio Score -> Log Meal -> Log Symptom.
- [ ] **End-to-End Web:** Login as Clinic -> Find the newly created user -> Verify the logged meal and symptom appear instantly.
- [ ] Fix any final P0/P1 bugs found during testing.
- [ ] **Go Live:** Merge `staging` into `main`! 🎉
