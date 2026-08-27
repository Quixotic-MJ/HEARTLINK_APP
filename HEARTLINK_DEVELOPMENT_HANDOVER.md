# HeartLink Capstone 2 — Project Context & Development Handover

> **Document Purpose**: Complete system architecture, operational guidelines, machine learning logic, API contracts, and the rigorous "Audit & Freeze" protocol for seamless agent-to-agent handover.

---

## 1. HeartLink System Overview & Core Mission

### Application Nature
**HeartLink** is a **cardiovascular health support and wellness tracking platform**, specifically designed for lifestyle, dietary, exercise, and vitals monitoring alongside expert validation.
* **Important Constraint**: HeartLink is **NOT** a hospital EHR, clinical diagnostics tool, or emergency triage system.
* **Framing & Terminology**: Uses operational, supportive, and wellness-focused language:
  * Preferred terms: *User*, *Expert Reviewer*, *Support Console*, *Health / Wellness Profile*, *Case Evaluation*, *HeartLink Stability Score (HSS)*.
  * Avoid clinical/hospital jargon like *Patients* (in admin view), *EHR*, *ICD-10*, or *Triage Center*.

### Canonical User Roles
The entire system enforces four strictly defined roles across both backend security gates and frontend UI routing:
1. `super_admin`: Full system administration, staff provisioning, staff status toggling, security settings, announcement broadcasts.
2. `admin`: General system administration, user management, feedback ticket resolution, content libraries (recipes/exercises), announcement broadcasts.
3. `expert`: Expert reviewer role for evaluating flagged user cases, validating HSS predictions, and recording calibration history.
4. `users`: Mobile app user logging daily blood pressure, heart rate, meals, exercise routines, sleep, and submitting feedback.

---

## 2. The "Audit & Freeze" Development Protocol

Every module in HeartLink is built, audited, hardened, and frozen using a **strict 2-phase lifecycle**:

```text
┌────────────────────────────────────────────────────────┐
│             PHASE 1: BACKEND FOUNDATION                │
│  1. Read-Only Backend & Data Audit                     │
│  2. Data Integrity, Schema, Persistence & Triggers     │
│  3. RBAC, Security Gate & Privacy Hardening            │
│  4. Automated Unit Testing (Behavioral + Edge Cases)   │
│  5. Freeze Backend & Endpoints                         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             PHASE 2: FRONTEND UI & INTEGRATION         │
│  1. Read-Only Frontend Audit (UI, State, Navigation)   │
│  2. Component Implementation & Styling                 │
│  3. Operational Hardening (Error States, Retries)      │
│  4. Optimistic Updates with Rollback on Failure        │
│  5. Accessibility (ARIA, Keyboard, Escape Listener)    │
│  6. Final Read-Only Audit & "READY TO FREEZE" Decision │
│  7. Advance to the Next Module                         │
└────────────────────────────────────────────────────────┘
```

### Key Rules of the Protocol:
1. **Never skip the Read-Only Audit**: Always inspect all files first, analyze edge cases, and produce an audit before modifying code.
2. **Never break Frozen Modules**: Any module declared `READY TO FREEZE` is permanently protected. Never alter its database schema, endpoints, or behavior in subsequent passes.
3. **Data Integrity First**: Ensure `load_logs()` and `save_logs()` serialization, FK constraints, and demo seed idempotency are verified with automated tests before building UI.
4. **Authoritative Backend**: Hiding buttons or UI elements in frontend is for UX only. The backend API dependencies (`get_current_admin_user`, `get_current_super_admin`, etc.) must always remain the authoritative security boundary.

---

## 3. Technology Stack & Architecture

### Backend (`/backend`)
* **Framework**: FastAPI (Python 3.11+)
* **Server**: Uvicorn
* **Authentication**: JWT Bearer Tokens (`PyJWT` / `python-jose`), SHA256 / PBKDF2 Password Hashing, 2FA Verification, Rate Limiting (5-failed-attempts lockout).
* **Machine Learning**: `scikit-learn`, `joblib`, `pandas`, `numpy` (NHANES-trained Logistic Regression Pipeline & Random Forest).
* **Testing**: Python `unittest` + `fastapi.testclient.TestClient`.

### Frontend Web Portal (`/HeartLink-web`)
* **Framework**: React 19 + Vite 8
* **Styling**: Vanilla CSS + Tailwind CSS v4
* **Icons**: `lucide-react`
* **Charts**: `recharts`
* **Routing**: `react-router-dom` v7 with role-based route protection (`ProtectedRoute` & `adminLayout.jsx`).

### Mobile App (`/HeartLink-mobile`)
* **Framework**: React Native + Expo (Patient self-monitoring interface).

---

## 4. Data Layer, Persistence & Idempotent Seeding

### In-Memory + JSON Serialization Architecture
* Primary store: `backend/app/mock_db.py` holds in-memory lists representing database collections.
* Persistence files:
  * `backend/app/mock_profiles.json` (User credentials, identity, staff permissions).
  * `backend/app/mock_logs.json` (Logs, feedback, admin notifications, broadcasts, activity logs, HSS history).
* Core sync functions:
  * `save_logs()` / `load_logs()`
  * `save_profiles()` / `load_profiles()`

### Deterministic Seeding & Demo Data Idempotency
To prevent duplicate records upon consecutive server restarts or test runs:
* Demo seed records are tagged with `"demo_seed": "<dataset-tag-version>"`.
* Example: `demo_seed = "heartlink-admin-notifications-demo-v1"`.
* Reseeding cleans existing records matching the specific demo tag and re-appends freshly computed records with relative UTC timestamps, while **strictly preserving all runtime-created entries**.

---

## 5. Machine Learning & HeartLink Stability Score (HSS)

HeartLink incorporates machine learning algorithms to compute and evaluate cardiovascular health stability:

### 1. Initial HSS Estimation (`hss_service.py` & `feature_transform.py`)
* **Model**: Trained Logistic Regression pipeline on NHANES epidemiological data (`heartlink_model.pkl`).
* **Input**: 37 transformed features derived from user onboarding questionnaires (Demographics, Age, Physical Activity, Sedentary Hours, Smoking, Alcohol, Dietary Sodium/Fat/Fiber scaling, Diagnosed Conditions, Resting BP, Heart Rate).
* **Output**:
  * Continuous Risk Probability: $P(\text{risk}) \in [0.0, 1.0]$.
  * HSS Formula: $\text{HSS} = \text{round}((1 - P(\text{risk})) \times 99) + 1 \in [1, 100]$.
* **Qualitative Stability Tiers**:
  * $\text{HSS} \ge 80$: **Stable** (Optimal cardiovascular wellness baseline).
  * $60 \le \text{HSS} < 80$: **Moderate** (Requires lifestyle attention).
  * $50 \le \text{HSS} < 60$: **Elevated Risk** (Requires targeted monitoring).
  * $\text{HSS} < 50$: **Critical** (Flagged for Expert Case Review).

### 2. Longitudinal HSS Tracking & Case Review (`clinical.py` & `dashboard.py`)
* Daily biometric inputs (Systolic BP, Diastolic BP, Heart Rate, Symptoms, Sodium/Meal intake, Exercise compliance, Sleep quality) dynamically adjust tracking metrics.
* Users exhibiting threshold breaches (e.g. Systolic > 120 mmHg or Diastolic > 80 mmHg) or critical HSS drops are routed to `/cases` for evaluation by `medical_expert` reviewers.
* Expert evaluations record qualitative feedback and calibration offsets in `mock_db.expert_evaluations` and `mock_db.calibrations`.

---

## 6. Module Status Ledger

| Module | Scope / Endpoints | Backend Status | Frontend Status | Overall State |
| :--- | :--- | :---: | :---: | :---: |
| **User Management** | `/api/admin/users`, `/api/admin/staff` | Verified & Tested | Verified & Hardened | 🔒 **FROZEN** |
| **Feedback Reports** | `/api/feedback` | Verified & Tested | Verified & Hardened | 🔒 **FROZEN** |
| **Activity Log** | `/api/admin/activity-logs` | Verified & Tested | Verified & Hardened | 🔒 **FROZEN** |
| **Announcements / Broadcasts** | `/api/admin/broadcasts` | Verified & Tested | Verified & Hardened | 🔒 **FROZEN** |
| **Settings & Account** | `/api/admin/settings`, `/api/users/profile` | Verified & Tested | Verified & Hardened | 🔒 **FROZEN** |
| **Admin Header & Notification Center** | `/api/admin/notifications`, `header.jsx`, `AdminNotificationDropdown.jsx` | Verified & Tested | Verified & Hardened | 🔒 **FROZEN** |
| **Case Review & Clinical Portal** | `/api/expert/cases`, `/api/expert/evaluations` | Pending Audit | Pending Audit | ⏳ **NEXT UP** |
| **Calibration History** | `/api/expert/calibrations` | Pending Audit | Pending Audit | ⏳ Queued |
| **Dashboard & Overview** | `/api/admin/dashboard` | Pending Audit | Pending Audit | ⏳ Queued |
| **Analytics** | `/api/admin/analytics` | Pending Audit | Pending Audit | ⏳ Queued |
| **Food & Recipe Library** | `/api/admin/recipes` | Pending Audit | Pending Audit | ⏳ Queued |
| **Exercise Routine Library** | `/api/admin/exercises` | Pending Audit | Pending Audit | ⏳ Queued |

---

## 7. Deep-Dive on Frozen Modules & API Contracts

### A. Admin Notification Center (`/api/admin/notifications`)
* **Strict Domain Isolation**: Admin notifications (`mock_db.admin_notifications`) are 100% decoupled from patient mobile notifications (`mock_db.notifications`).
* **Endpoints**:
  * `GET /api/admin/notifications`: Role-filtered (`admin` vs `super_admin`), returns `{ items, unread_count, total }`.
  * `PUT /api/admin/notifications/{id}/read`: Per-user `read_by` isolation.
  * `PUT /api/admin/notifications/mark-all-read`: Marks all visible role-scoped notifications read for caller.
* **Triggers**: Non-blocking hooks in Feedback creation, Staff provisioning/status toggle, and 5-attempt brute-force login lockouts.
* **Privacy**: Strict exclusion of passwords, tokens, HSS values, vitals, and phone numbers.
* **UI Hardening**: 60s visibility-aware polling (`document.visibilityState`), in-flight request lock, optimistic rollback on API failure, Escape key dismissal, and ARIA accessibility.

### B. Admin Header (`header.jsx` & `adminLayout.jsx`)
* **Role-Aware Search**:
  * `admin` / `super_admin` → Routes to `/users?search=${query}` with `"Search users by name or ID..."`.
  * `medical_expert` → Routes to `/cases?search=${query}` with `"Search cases by name or ID..."` (preventing unauthorized ejection to `/dashboard`).
* **Quick Actions**: Dropdown with Escape key listener and role-tailored actions ("Send Announcement", "Provision staff account", "View Dashboard", "Review Cases").
* **Canonical Role Resolution**: Derived purely from `user?.role`. Zero hardcoded user ID inferences.
* **System Status**: Labeled as "Operational" with standard status indicator.

---

## 8. Verification & Execution Commands

### Run Complete Backend Unit Test Suite (182 Tests)
```powershell
cd "c:\Users\JOHN MARK MAGDASAL\OneDrive\Desktop\CTU main\CAPSTONE-2\backend"
python -m unittest discover -s . -p "test_*.py"
```

### Run Dedicated Admin Notifications Test Suite (31 Tests)
```powershell
python -m unittest test_admin_notifications.py
```

### Build Web Frontend (Vite)
```powershell
cd "c:\Users\JOHN MARK MAGDASAL\OneDrive\Desktop\CTU main\CAPSTONE-2\HeartLink-web"
npm run build
```

---

## 9. Recommended Next Action for the New Chatbot / Agent

When resuming work in a new session:
1. **Target Module**: **Case Review & Clinical Portal (`/cases`)** or **Dashboard Overview (`/dashboard`)**.
2. **First Action**: Execute a **Read-Only Audit** of the target module's backend service, mock data, and frontend components before writing code.
3. **Follow the Standard Protocol**: Audit Backend → Implement/Harden Backend + Tests → Audit Frontend → Implement/Harden UI → Verify & Freeze.
