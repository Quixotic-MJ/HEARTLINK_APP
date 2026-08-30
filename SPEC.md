# HeartLink System Specification

---

## 1. Document Status

- **Document Purpose**: Canonical technical specification of the HeartLink platform, capturing the exact architecture, database schema, API contracts, authorization models, and client behaviors as implemented.
- **Current Architecture State**: Post-Migration (migrated from local JSON/mock storage to a PostgreSQL backend on Supabase, with repository abstraction, JWT authentication, and hybrid offline-first client synchronization).
- **Active Database Mode**: `DATABASE_MODE=supabase` (PostgreSQL via PostgREST / Supabase Python Client with repository abstraction).
- **Specification Generation Date**: August 27, 2026.
- **Authoritative Scope**: This document describes the **CURRENT ACTIVE IMPLEMENTATION** in the repository. It is **NOT** a future design proposal or conceptual roadmap.
- **Source of Truth Rule**: All schemas, API routes, constraints, and business rules documented herein have been verified against active migration files (`backend/supabase/migrations/*.sql`), backend source code (`backend/app/**`), mobile client code (`HeartLink-mobile/**`), and web client code (`HeartLink-web/**`).

---

## 2. System Architecture

```text
               ┌─────────────────────────────────────────────────────────┐
               │                      CLIENT LAYER                       │
               ├────────────────────────────┬────────────────────────────┤
               │    HeartLink Mobile App    │   HeartLink Web Admin      │
               │   (React Native / Expo)    │   & Medical Expert Portal  │
               │   - End-User Health Client │   (React / Vite)           │
               │   - Local Cache & Queues   │   - Admin & Expert UI      │
               └─────────────┬──────────────┴─────────────┬──────────────┘
                             │                            │
                     HTTPS / REST API             HTTPS / REST API
                     (Bearer JWT)                 (Bearer JWT)
                             │                            │
                             ▼                            ▼
               ┌─────────────────────────────────────────────────────────┐
               │                 FASTAPI BACKEND GATEWAY                 │
               │                 (backend/app/main.py)                   │
               ├─────────────────────────────────────────────────────────┤
               │ • CORS Middleware (Origin Whitelist)                    │
               │ • JWT Auth & Role Security (security.py)                │
               │ • Static Uploads Mount (/static)                        │
               │ • API Routers:                                          │
               │   - /api/auth               - /api/notifications        │
               │   - /api/users              - /api/admin                │
               │   - /api/dashboard          - /api/expert               │
               │   - /api/health-logs        - /api/admin/notifications  │
               │   - /api/sleep-logs         - /api/upload               │
               │   - /api/meals              - /api/feedback             │
               │   - /api/exercises          - /api/clinics              │
               │   - /api/recipes            - /api/analytics            │
               ├─────────────────────────────────────────────────────────┤
               │                   SERVICE LAYER                         │
               │ • AuthService (OTP / Password / 2FA)                    │
               │ • HSS Scoring Engine (NHANES LogisticRegression)       │
               │ • Dashboard & Telemetry Aggregation                     │
               │ • Storage Service (Avatar / Recipe / Exercise assets)   │
               ├─────────────────────────────────────────────────────────┤
               │               REPOSITORY ABSTRACTION LAYER              │
               │               (backend/app/db/repositories/)            │
               │ Base Repository & Error Sanitization (base.py)          │
               │ Domain Repos: Profiles, Baseline, HealthLogs, Meals,    │
               │   Exercises, Sleep, HSS, Content, Notifications,        │
               │   Admin, Feedback, CaseReview                           │
               └────────────────────────────┬────────────────────────────┘
                                            │
                             PostgREST / Supabase Client
                             (Service Role Key / JWT)
                                            │
                                            ▼
               ┌─────────────────────────────────────────────────────────┐
               │                   SUPABASE INFRASTRUCTURE              │
               ├─────────────────────────────────────────────────────────┤
               │ 1. Supabase Auth: auth.users identity table             │
               │ 2. Supabase PostgreSQL: 26 application tables (public)   │
               │    - Row Level Security (RLS) on all 26 tables          │
               │    - Indexes on timeline, unread states, & audit logs   │
               │    - DB Triggers (updated_at, activity log immutability)│
               │ 3. Supabase Storage:                                    │
               │    - 'avatars' bucket (2 MB limit, user write)          │
               │    - 'recipes' bucket (5 MB limit, staff write)         │
               │    - 'exercises' bucket (20 MB limit, staff write)      │
               └─────────────────────────────────────────────────────────┘
```

### Components Summary
1. **HeartLink Mobile Client**: Cross-platform Expo/React Native mobile application targeting end-user patients for health logging (vitals, symptoms, meals, exercises, sleep), viewing personalised recommendations, tracking Health Stability Scores, setting reminders, and managing care teams.
2. **HeartLink Web Portal**: Vite/React SPA providing dual-role interfaces:
   - **System Administrators**: User management, staff provisioning, system announcements, feedback ticket triage, activity audit logs, and content management.
   - **Medical Experts**: Clinical case review queue, patient telemetry snapshots, evaluation logging, dataset generation, and candidate ML model calibration tracking.
3. **FastAPI Application**: Central Python REST API orchestrating business logic, model inference, authentication, rate limiting, data transformation, and database error mapping.
4. **Repository Layer**: Decoupled interface architecture enabling strict domain-specific data operations and isolating database drivers from route handlers.
5. **Supabase PostgreSQL & Storage**: Authoritative cloud database with PostgreSQL schemas, check constraints, foreign keys, RLS policies, and asset object storage.
6. **Offline Synchronization System**: AsyncStorage-backed request and domain queues in the mobile client providing store-and-forward resilience when network connectivity is lost.

---

## 4. Roles & Authorization

### Application Roles
The system recognizes four distinct roles, validated on the `profiles.role` column and encoded in JWT claims:
1. `patient`: Regular mobile application user who owns and logs personal health data.
2. `medical_expert`: Clinical reviewer authorized to inspect flagged patient telemetry, evaluate HSS accuracy, and contribute to calibration datasets.
3. `admin`: System administrator authorized to manage content, publish announcements, handle feedback, manage patient accounts, and view platform analytics.
4. `super_admin`: Highest-privilege administrator with exclusive rights to provision staff, promote/demote roles, modify staff statuses, and perform sensitive administrative operations.

### Role Capability Matrix

| Capability | Anonymous | Patient | Medical Expert | Admin | Super Admin | Backend Enforcement |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| Register / OTP Request | ✅ | ✅ | ❌ | ❌ | ❌ | Unauthenticated endpoint |
| Login (Mobile / Web) | ✅ | ✅ | ✅ | ✅ | ✅ | Unauthenticated endpoint |
| Read / Update Own Profile | ❌ | ✅ | ✅ | ✅ | ✅ | `get_current_user` + ID check |
| Complete Baseline Questionnaire | ❌ | ✅ | ❌ | ❌ | ❌ | `get_current_user` + ID check |
| Log Health Telemetry (BP, Meals, etc.) | ❌ | ✅ | ❌ | ❌ | ❌ | `get_current_user` + ID check |
| Read Own Dashboard & Wrap-Up | ❌ | ✅ | ❌ | ❌ | ❌ | `get_current_user` (caller token) |
| Read Public Recipes / Routines / Clinics | ✅ | ✅ | ✅ | ✅ | ✅ | Public route / status check |
| Submit Support / Bug Feedback | ❌ | ✅ | ✅ | ✅ | ✅ | `get_feedback_user` |
| View Admin Dashboard & KPI Analytics | ❌ | ❌ | ❌ | ✅ | ✅ | `get_current_admin_user` |
| Manage Content (Recipes / Exercises) | ❌ | ❌ | ❌ | ✅ | ✅ | `get_current_admin_user` |
| Publish System Broadcasts | ❌ | ❌ | ❌ | ✅ | ✅ | `get_current_admin_user` |
| View / Triage Feedback Tickets | ❌ | ❌ | ❌ | ✅ | ✅ | `require_admin_or_super_admin` |
| View Admin Activity Audit Log | ❌ | ❌ | ❌ | ✅ | ✅ | `get_current_admin_user` (admin check) |
| Toggle Patient Account Status | ❌ | ❌ | ❌ | ✅ | ✅ | `get_current_admin_user` |
| Access Clinical Case Review Queue | ❌ | ❌ | ✅ | ✅ | ✅ | `get_current_admin_user` |
| Submit Clinical Case Evaluation | ❌ | ❌ | ✅ | ❌ | ❌ | `_require_medical_expert` |
| Generate Calibration Datasets | ❌ | ❌ | ❌ | ✅ | ✅ | `get_current_admin_user` |
| Register / Update ML Candidate Models | ❌ | ❌ | ❌ | ✅ | ✅ | `get_current_admin_user` |
| Provision Staff Accounts (Admin/Expert)| ❌ | ❌ | ❌ | ❌ | ✅ | `get_current_super_admin` |
| Modify Staff Status / Change Roles | ❌ | ❌ | ❌ | ❌ | ✅ | `get_current_super_admin` |

### Authentication & Session Lifecycle
- **Tokens**: JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
- **Payload Claims**: Standard JWT claims containing `sub` / `user_id`, `role`, `email`, `phone`, and expiration `exp` (24 hours).
- **Token Verification**: Handled by `app.utils.security.verify_token`, strictly requiring cryptographic signature validation against `SECRET_KEY` (or `SUPABASE_JWT_SECRET`). Tokens missing signatures or failing signature verification are rejected with HTTP 401.
- **Revocation / Logout**: Active tokens can be added to the server-side `token_blacklist` set via `POST /api/auth/logout`. Blacklisted tokens return HTTP 401 on subsequent requests.
- **Account Status Guard**: Every authenticated request evaluates `profiles.account_status`. If the account is `'disabled'` or `'archived'`, the request is immediately rejected with HTTP 403.
- **Self-Protection Guardrails**: Admins cannot deactivate their own accounts; super admins cannot demote themselves or deactivate the last remaining active super admin.

---

## 5. Database Schema

Derivation Source: `backend/supabase/migrations/001_extensions.sql` through `012_add_duration_seconds_to_exercise_logs.sql`.

### Master Schema Overview Table

| Table | Purpose | Primary Key | Key Foreign Keys | Unique Constraints | Delete Behavior | RLS |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `profiles` | User identity, core biometrics, roles | `id (UUID)` | `auth.users(id)` | `legacy_id` | CASCADE | Enabled |
| `baseline_onboarding` | 6-step lifestyle questionnaire responses | `id (UUID)` | `user_id -> profiles(id)` | `user_id` (1:1) | CASCADE | Enabled |
| `user_thresholds` | Personalized clinical alert limits | `id (UUID)` | `user_id -> profiles(id)` | `user_id` (1:1) | CASCADE | Enabled |
| `user_reminders` | Morning/evening/activity reminder times | `id (UUID)` | `user_id -> profiles(id)` | `user_id` (1:1) | CASCADE | Enabled |
| `care_team_contacts` | Doctors and emergency contacts | `id (UUID)` | `user_id -> profiles(id)` | None | CASCADE | Enabled |
| `recipes` | Global heart-healthy recipes library | `id (UUID)` | `created_by -> profiles(id)` | `legacy_id` | SET NULL | Enabled |
| `exercise_routines` | Physical exercise routines library | `id (UUID)` | `created_by -> profiles(id)` | `legacy_id` | SET NULL | Enabled |
| `clinics` | Directory of medical clinics | `id (UUID)` | None | `legacy_id` | N/A | Enabled |
| `saved_recipes` | User bookmarks for recipes | `id (UUID)` | `user_id`, `recipe_id` | `(user_id, recipe_id)` | CASCADE | Enabled |
| `saved_exercises` | User bookmarks for routines | `id (UUID)` | `user_id`, `routine_id` | `(user_id, routine_id)` | CASCADE | Enabled |
| `daily_health_logs` | Daily vitals (BP, HR, sugar) & symptoms | `id (UUID)` | `user_id -> profiles(id)` | None | CASCADE | Enabled |
| `meal_logs` | Logged meals, sodium, calories | `id (UUID)` | `user_id`, `recipe_id` | None | CASCADE / SET NULL | Enabled |
| `exercise_logs` | Completed physical exercise sessions | `id (UUID)` | `user_id`, `routine_id` | None | CASCADE / SET NULL | Enabled |
| `sleep_logs` | Sleep duration & quality logs | `id (UUID)` | `user_id -> profiles(id)` | None | CASCADE | Enabled |
| `hss_history` | Historical Health Stability Scores | `id (UUID)` | `user_id -> profiles(id)` | None | CASCADE | Enabled |
| `clinical_alerts` | Out-of-bound vitals and health alerts | `id (UUID)` | `user_id -> profiles(id)` | None | CASCADE | Enabled |
| `system_broadcasts` | Admin platform announcements | `id (UUID)` | `publisher_id -> profiles(id)`| `legacy_id` | SET NULL | Enabled |
| `patient_notifications`| Patient inbox notifications & broadcasts | `id (UUID)` | `user_id`, `broadcast_id` | None | CASCADE | Enabled |
| `admin_notifications` | Operational alerts for admin staff | `id (UUID)` | None | `legacy_id` | N/A | Enabled |
| `admin_notification_reads` | Read receipts per admin user | `(notif_id, admin_id)`| `admin_notifications`, `profiles`| Composite PK | CASCADE | Enabled |
| `admin_activity_logs` | Immutable audit log of staff actions | `id (UUID)` | `admin_user_id -> profiles(id)`| None | SET NULL | Enabled |
| `feedback_tickets` | User bug reports & suggestions | `id (UUID)` | `user_id -> profiles(id)` | `ticket_code` | SET NULL | Enabled |
| `calibration_datasets` | Versioned training datasets for ML | `id (UUID)` | `created_by -> profiles(id)` | `dataset_id` | SET NULL | Enabled |
| `candidate_models` | ML candidate model artifact registry | `id (UUID)` | None | `model_id` | N/A | Enabled |
| `calibration_records` | Offline calibration run statistics | `id (UUID)` | `dataset_id`, `calibrated_by` | None | SET NULL | Enabled |
| `expert_evaluations` | Clinical evaluations of patient cases | `id (UUID)` | `user_id`, `expert_id` | `legacy_id` | SET NULL | Enabled |

---

### Detailed Table Specifications

#### 1. `public.profiles`
- **Purpose**: Authoritative identity, demographic, and biometric profile for all registered users.
- **Primary Key**: `id UUID` (References `auth.users(id)` ON DELETE CASCADE).
- **Columns**:
  - `id UUID NOT NULL`
  - `legacy_id TEXT UNIQUE`
  - `phone TEXT`
  - `email TEXT`
  - `first_name TEXT DEFAULT ''`
  - `last_name TEXT DEFAULT ''`
  - `date_of_birth DATE`
  - `sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female'))`
  - `height_cm NUMERIC CHECK (height_cm IS NULL OR (height_cm >= 50.0 AND height_cm <= 300.0))`
  - `weight_kg NUMERIC CHECK (weight_kg IS NULL OR (weight_kg >= 20.0 AND weight_kg <= 400.0))`
  - `avatar_url TEXT`
  - `health_goals TEXT[] DEFAULT '{}'`
  - `onboarding_status TEXT DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'complete'))`
  - `account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'disabled', 'archived'))`
  - `role TEXT DEFAULT 'patient' CHECK (role IN ('patient', 'medical_expert', 'admin', 'super_admin'))`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- **Triggers**: `set_profiles_updated_at` (updates `updated_at`).
- **RLS**: Users can read/update own profile; staff (`admin`, `super_admin`, `medical_expert`) can view patient profiles.

#### 2. `public.baseline_onboarding`
- **Purpose**: Captures patient baseline lifestyle survey data across physical activity, sleep, smoking, alcohol, and diet.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns & Constraints**:
  - `vigorous_activity BOOLEAN NOT NULL DEFAULT false`
  - `vigorous_days INT CHECK (vigorous_days IS NULL OR (vigorous_days >= 1 AND vigorous_days <= 7))`
  - `vigorous_minutes INT CHECK (vigorous_minutes IS NULL OR (vigorous_minutes >= 1 AND vigorous_minutes <= 720))`
  - `moderate_activity BOOLEAN NOT NULL DEFAULT false`
  - `moderate_days INT CHECK (moderate_days IS NULL OR (moderate_days >= 1 AND moderate_days <= 7))`
  - `moderate_minutes INT CHECK (moderate_minutes IS NULL OR (moderate_minutes >= 1 AND moderate_minutes <= 720))`
  - `walk_bike_transport BOOLEAN NOT NULL DEFAULT false`
  - `walk_bike_days INT CHECK (walk_bike_days IS NULL OR (walk_bike_days >= 1 AND walk_bike_days <= 7))`
  - `walk_bike_minutes INT CHECK (walk_bike_minutes IS NULL OR (walk_bike_minutes >= 1 AND walk_bike_minutes <= 720))`
  - `sedentary_hours TEXT NOT NULL CHECK (sedentary_hours IN ('<2h', '2-4h', '4-6h', '6-8h', '8+h'))`
  - `sleep_hours NUMERIC NOT NULL CHECK (sleep_hours >= 1.0 AND sleep_hours <= 24.0)`
  - `ever_smoked BOOLEAN NOT NULL DEFAULT false`
  - `smoke_now TEXT CHECK (smoke_now IS NULL OR smoke_now IN ('Every day', 'Some days', 'Not at all'))`
  - `ever_drank BOOLEAN NOT NULL DEFAULT false`
  - `drink_frequency TEXT CHECK (drink_frequency IS NULL OR drink_frequency IN ('Never', 'Monthly or less', '2-4x/month', '2-3x/week', '4+/week'))`
  - `drinks_per_occasion TEXT CHECK (drinks_per_occasion IS NULL OR drinks_per_occasion IN ('1-2', '3-4', '5+'))`
  - `binge_drinking_freq TEXT CHECK (binge_drinking_freq IS NULL OR binge_drinking_freq IN ('Never', 'Monthly or less', '2-4x/month', '2-3x/week', '4+/week'))`
  - `diet_level TEXT NOT NULL CHECK (diet_level IN ('light', 'average', 'heavy', 'very_heavy'))`
  - `fried_food_freq TEXT NOT NULL CHECK (fried_food_freq IN ('rarely', 'sometimes', 'often', 'daily'))`
  - `salty_food_freq TEXT NOT NULL CHECK (salty_food_freq IN ('rarely', 'sometimes', 'often', 'daily'))`
  - `fruit_veg_servings TEXT NOT NULL CHECK (fruit_veg_servings IN ('0-1', '2-3', '4-5', '6+'))`
  - `allergies TEXT[] DEFAULT '{}'`
  - `dietary_practice TEXT DEFAULT 'None'`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- **Triggers**: `set_baseline_updated_at`

#### 3. `public.user_thresholds`
- **Purpose**: Stores customized patient limits for sodium, fluids, activity goals, and blood pressure trigger limits.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns & Constraints**:
  - `sodium_limit_mg INT NOT NULL CHECK (sodium_limit_mg >= 500 AND sodium_limit_mg <= 5000)`
  - `fluid_limit_ml INT DEFAULT 2000 CHECK (fluid_limit_ml IS NULL OR (fluid_limit_ml >= 500 AND fluid_limit_ml <= 5000))`
  - `active_minutes_goal INT NOT NULL CHECK (active_minutes_goal >= 0 AND active_minutes_goal <= 300)`
  - `systolic_threshold INT NOT NULL CHECK (systolic_threshold >= 80 AND systolic_threshold <= 200)`
  - `diastolic_threshold INT NOT NULL CHECK (diastolic_threshold >= 40 AND diastolic_threshold <= 130)`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 4. `public.user_reminders`
- **Purpose**: Stores JSON-encoded daily schedule preferences for morning vitals, evening check-in, and activity alerts.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns**:
  - `morning JSONB NOT NULL DEFAULT '{"enabled": true, "time": "08:00"}'::jsonb`
  - `evening JSONB NOT NULL DEFAULT '{"enabled": false, "time": "20:00"}'::jsonb`
  - `activity JSONB NOT NULL DEFAULT '{"enabled": false, "time": "17:00"}'::jsonb`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 5. `public.care_team_contacts`
- **Purpose**: Doctors, cardiologists, and emergency contacts linked to patient accounts.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns & Constraints**:
  - `name TEXT NOT NULL`
  - `role_title TEXT NOT NULL`
  - `contact_type TEXT NOT NULL DEFAULT 'doctor' CHECK (contact_type IN ('doctor', 'emergency'))`
  - `phone TEXT NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 6. `public.recipes`
- **Purpose**: Curated heart-healthy recipes with nutritional breakdowns and HSS tier alignments.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Columns & Constraints**:
  - `legacy_id TEXT UNIQUE`
  - `name TEXT NOT NULL`
  - `subtitle TEXT`
  - `category TEXT NOT NULL CHECK (category IN ('Breakfast', 'Lunch', 'Dinner', 'Snack'))`
  - `hss_tier TEXT NOT NULL CHECK (hss_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical'))`
  - `sodium_mg NUMERIC NOT NULL CHECK (sodium_mg >= 0)`
  - `calories NUMERIC NOT NULL CHECK (calories >= 0)`
  - `saturated_fat_g NUMERIC NOT NULL DEFAULT 0 CHECK (saturated_fat_g >= 0)`
  - `cholesterol_mg NUMERIC NOT NULL DEFAULT 0 CHECK (cholesterol_mg >= 0)`
  - `fiber_g NUMERIC NOT NULL DEFAULT 0 CHECK (fiber_g >= 0)`
  - `prep_time_minutes INT NOT NULL CHECK (prep_time_minutes >= 0)`
  - `servings INT NOT NULL CHECK (servings >= 1)`
  - `difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))`
  - `heart_benefit TEXT`
  - `tags TEXT[] DEFAULT '{}'`
  - `ingredients JSONB NOT NULL DEFAULT '[]'::jsonb`
  - `steps TEXT[] DEFAULT '{}'`
  - `image_url TEXT DEFAULT ''`
  - `status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'))`
  - `expert_validated BOOLEAN NOT NULL DEFAULT true`
  - `created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 7. `public.exercise_routines`
- **Purpose**: Physical exercise routines with intensity levels, step instructions, and HSS tier alignments.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Columns & Constraints**:
  - `legacy_id TEXT UNIQUE`
  - `name TEXT NOT NULL`
  - `description TEXT`
  - `duration_minutes INT NOT NULL CHECK (duration_minutes >= 1)`
  - `hss_tier TEXT NOT NULL CHECK (hss_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical'))`
  - `type TEXT NOT NULL`
  - `intensity TEXT NOT NULL CHECK (intensity IN ('None', 'Low', 'Moderate', 'High'))`
  - `goal TEXT`
  - `steps JSONB NOT NULL DEFAULT '[]'::jsonb`
  - `media_url TEXT DEFAULT ''`
  - `video_url TEXT DEFAULT ''`
  - `guide_images TEXT[] DEFAULT '{}'`
  - `status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'))`
  - `expert_validated BOOLEAN NOT NULL DEFAULT true`
  - `created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 8. `public.clinics`
- **Purpose**: Directory of medical clinics for patient referral and geographic map locating.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Columns**:
  - `legacy_id TEXT UNIQUE`
  - `name TEXT NOT NULL`
  - `doctor TEXT NOT NULL`
  - `latitude NUMERIC NOT NULL`
  - `longitude NUMERIC NOT NULL`
  - `phone TEXT NOT NULL`
  - `specialty TEXT NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 9. `public.saved_recipes`
- **Purpose**: Relational bookmarks linking user profiles to saved recipes.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`, `recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE`
- **Unique Constraint**: `UNIQUE (user_id, recipe_id)`
- **Columns**: `saved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 10. `public.saved_exercises`
- **Purpose**: Relational bookmarks linking user profiles to saved exercise routines.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`, `routine_id UUID REFERENCES public.exercise_routines(id) ON DELETE CASCADE`
- **Unique Constraint**: `UNIQUE (user_id, routine_id)`
- **Columns**: `saved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 11. `public.daily_health_logs`
- **Purpose**: Patient vitals recordings (blood pressure, heart rate, blood sugar, weight, symptoms).
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns & Constraints**:
  - `systolic_bp INT NOT NULL CHECK (systolic_bp >= 50 AND systolic_bp <= 300)`
  - `diastolic_bp INT NOT NULL CHECK (diastolic_bp >= 30 AND diastolic_bp <= 200)`
  - `heart_rate_bpm INT NOT NULL CHECK (heart_rate_bpm >= 30 AND heart_rate_bpm <= 250)`
  - `weight_kg NUMERIC CHECK (weight_kg IS NULL OR (weight_kg >= 20.0 AND weight_kg <= 400.0))`
  - `blood_sugar NUMERIC CHECK (blood_sugar IS NULL OR (blood_sugar >= 20.0 AND blood_sugar <= 1000.0))`
  - `medication_taken BOOLEAN NOT NULL DEFAULT false`
  - `symptoms TEXT[] DEFAULT '{}'`
  - `severity_map JSONB DEFAULT '{}'::jsonb`
  - `context TEXT CHECK (context IS NULL OR context IN ('resting', 'after_eating', 'after_exercise', 'morning', 'evening', 'other'))`
  - `notes TEXT`
  - `triggered_by_exercise_id UUID`
  - `logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 12. `public.meal_logs`
- **Purpose**: Patient dietary tracking logs.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`, `recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL`
- **Columns & Constraints**:
  - `meal_name TEXT NOT NULL`
  - `barcode TEXT`
  - `portion TEXT DEFAULT '1 serving'`
  - `calories NUMERIC NOT NULL CHECK (calories >= 0)`
  - `sodium_mg NUMERIC NOT NULL CHECK (sodium_mg >= 0)`
  - `saturated_fat_g NUMERIC NOT NULL DEFAULT 0 CHECK (saturated_fat_g >= 0)`
  - `fiber_g NUMERIC NOT NULL DEFAULT 0 CHECK (fiber_g >= 0)`
  - `image_url TEXT DEFAULT ''`
  - `logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 13. `public.exercise_logs`
- **Purpose**: Patient physical activity logs with sub-minute precision.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`, `routine_id UUID REFERENCES public.exercise_routines(id) ON DELETE SET NULL`
- **Columns & Constraints** (Updated via Migration 012):
  - `routine_name TEXT NOT NULL`
  - `duration_minutes INT NOT NULL CHECK (duration_minutes >= 0 AND duration_minutes <= 1440)`
  - `duration_seconds INT DEFAULT 0`
  - `status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'skipped', 'partial', 'incomplete_due_to_symptoms', 'abandoned'))`
  - `logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 14. `public.sleep_logs`
- **Purpose**: Patient sleep records with soft-deletion support.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns & Constraints**:
  - `duration_hours NUMERIC NOT NULL CHECK (duration_hours >= 0.5 AND duration_hours <= 24.0)`
  - `quality TEXT NOT NULL CHECK (quality IN ('Poor', 'Fair', 'Good', 'Excellent'))`
  - `is_deleted BOOLEAN NOT NULL DEFAULT false`
  - `logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 15. `public.hss_history`
- **Purpose**: Chronological log of computed Health Stability Scores.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns & Constraints**:
  - `score INT NOT NULL CHECK (score >= 1 AND score <= 100)`
  - `tier TEXT NOT NULL CHECK (tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical'))`
  - `risk_probability NUMERIC CHECK (risk_probability IS NULL OR (risk_probability >= 0.0 AND risk_probability <= 1.0))`
  - `source TEXT NOT NULL DEFAULT 'telemetry' CHECK (source IN ('baseline', 'telemetry', 'expert_override'))`
  - `model_version TEXT DEFAULT 'v1.0.0'`
  - `model_hash TEXT`
  - `contributing_factors JSONB DEFAULT '{}'::jsonb`
  - `computed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 16. `public.clinical_alerts`
- **Purpose**: Threshold violations and critical clinical notifications.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns & Constraints**:
  - `severity TEXT NOT NULL CHECK (severity IN ('Info', 'Warning', 'Critical'))`
  - `alert_type TEXT NOT NULL`
  - `title TEXT NOT NULL`
  - `message TEXT NOT NULL`
  - `status TEXT NOT NULL DEFAULT 'Under Review' CHECK (status IN ('Under Review', 'Resolved', 'Dismissed'))`
  - `trigger_context JSONB DEFAULT '{}'::jsonb`
  - `system_action TEXT`
  - `flagged_hss INT`
  - `patient_snapshot JSONB DEFAULT '{}'::jsonb`
  - `metadata JSONB DEFAULT '{}'::jsonb`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `resolved_at TIMESTAMPTZ`

#### 17. `public.system_broadcasts`
- **Purpose**: Platform-wide announcements created by administrators.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `publisher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- **Columns & Constraints**:
  - `legacy_id TEXT UNIQUE`
  - `title TEXT NOT NULL`
  - `message TEXT NOT NULL`
  - `type TEXT NOT NULL CHECK (type IN ('Maintenance', 'App Update', 'Safety Reminder', 'General', 'Health Tip', 'Feature Update', 'General Announcement'))`
  - `target_audience TEXT NOT NULL DEFAULT 'All Registered Accounts'`
  - `publisher TEXT`
  - `display_publisher TEXT NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 18. `public.patient_notifications`
- **Purpose**: Personalized alerts, reminders, achievements, and broadcast fan-out copies for patient inboxes.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`, `broadcast_id UUID REFERENCES public.system_broadcasts(id) ON DELETE CASCADE`, `publisher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- **Columns & Constraints**:
  - `type TEXT NOT NULL CHECK (type IN ('alert', 'insight', 'achievement', 'reminder', 'announcement', 'system'))`
  - `scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'broadcast'))`
  - `broadcast_type TEXT`
  - `title TEXT NOT NULL`
  - `message TEXT NOT NULL`
  - `read BOOLEAN NOT NULL DEFAULT false`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 19. `public.admin_notifications`
- **Purpose**: Operational alerts routed to system admins (new feedback, staff provisioning, status changes).
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Columns & Constraints**:
  - `legacy_id TEXT UNIQUE`
  - `type TEXT NOT NULL CHECK (type IN ('feedback', 'staff', 'security', 'system'))`
  - `title TEXT NOT NULL`
  - `message TEXT NOT NULL`
  - `severity TEXT NOT NULL CHECK (severity IN ('info', 'warning'))`
  - `recipient_roles TEXT[] NOT NULL DEFAULT '{admin,super_admin}'`
  - `route TEXT NOT NULL CHECK (route IN ('/feedbacks', '/users', '/settings'))`
  - `target_id TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 20. `public.admin_notification_reads`
- **Purpose**: Normalized read receipts tracking which admin users have read specific admin notifications.
- **Primary Key**: `(notification_id, admin_user_id)`
- **Foreign Keys**: `notification_id UUID REFERENCES public.admin_notifications(id) ON DELETE CASCADE`, `admin_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE`
- **Columns**: `read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 21. `public.admin_activity_logs`
- **Purpose**: Immutable audit stream capturing staff operations.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- **Columns**:
  - `admin_name TEXT NOT NULL`
  - `action TEXT NOT NULL`
  - `target_type TEXT NOT NULL`
  - `target_id TEXT`
  - `target_name TEXT`
  - `details JSONB DEFAULT '{}'::jsonb`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- **Triggers**: `deny_activity_log_modification` (strictly prevents UPDATE and DELETE on this table).

#### 22. `public.feedback_tickets`
- **Purpose**: User support requests, bug reports, and UX feedback.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- **Columns & Constraints**:
  - `ticket_code TEXT UNIQUE NOT NULL`
  - `user_name TEXT NOT NULL`
  - `user_email TEXT NOT NULL`
  - `category TEXT NOT NULL CHECK (category IN ('Bug Report', 'UI/UX Suggestion', 'Account Issue', 'Question', 'Other'))`
  - `preview TEXT NOT NULL`
  - `full_message TEXT NOT NULL`
  - `status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed'))`
  - `device_meta JSONB DEFAULT '{}'::jsonb`
  - `admin_notes TEXT DEFAULT ''`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- **Triggers**: `set_feedback_updated_at`

#### 23. `public.calibration_datasets`
- **Purpose**: Anonymized training and validation datasets compiled from clinical expert evaluations.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- **Columns & Constraints**:
  - `dataset_id TEXT UNIQUE NOT NULL`
  - `name TEXT NOT NULL`
  - `description TEXT`
  - `record_count INT NOT NULL DEFAULT 0 CHECK (record_count >= 0)`
  - `excluded_record_count INT NOT NULL DEFAULT 0 CHECK (excluded_record_count >= 0)`
  - `model_hashes_represented TEXT[] DEFAULT '{}'`
  - `feature_pipeline_versions_represented TEXT[] DEFAULT '{}'`
  - `source_evaluation_ids TEXT[] DEFAULT '{}'`
  - `rows JSONB NOT NULL DEFAULT '[]'::jsonb`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 24. `public.candidate_models`
- **Purpose**: Registry of candidate machine learning models, validation metrics, and deployment statuses.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Columns & Constraints**:
  - `model_id TEXT UNIQUE NOT NULL`
  - `artifact_filename TEXT NOT NULL`
  - `model_hash TEXT NOT NULL`
  - `dataset_id TEXT`
  - `feature_pipeline_identifier TEXT`
  - `validation_metrics JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved', 'rejected', 'deployed'))`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 25. `public.calibration_records`
- **Purpose**: Statistical evaluation runs measuring model calibration metrics (Brier score, Expected Calibration Error).
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `dataset_id UUID REFERENCES public.calibration_datasets(id) ON DELETE SET NULL`, `calibrated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- **Columns & Constraints**:
  - `model_version TEXT NOT NULL`
  - `pre_brier_score NUMERIC NOT NULL`
  - `post_brier_score NUMERIC NOT NULL`
  - `pre_ece NUMERIC NOT NULL`
  - `post_ece NUMERIC NOT NULL`
  - `calibration_method TEXT NOT NULL CHECK (calibration_method IN ('platt_scaling', 'isotonic_regression', 'temperature_scaling'))`
  - `calibrated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

#### 26. `public.expert_evaluations`
- **Purpose**: Clinical assessments of patient cases submitted by medical experts.
- **Primary Key**: `id UUID DEFAULT gen_random_uuid()`
- **Foreign Keys**: `user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`, `expert_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL`
- **Columns & Constraints**:
  - `legacy_id TEXT UNIQUE`
  - `case_id TEXT NOT NULL`
  - `reviewer_name TEXT NOT NULL`
  - `model_score INT NOT NULL`
  - `model_tier TEXT NOT NULL`
  - `expert_score INT NOT NULL CHECK (expert_score >= 1 AND expert_score <= 100)`
  - `expert_tier TEXT NOT NULL CHECK (expert_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical'))`
  - `score_difference INT NOT NULL`
  - `tier_match BOOLEAN NOT NULL`
  - `notes TEXT NOT NULL`
  - `recommendation_feedback JSONB DEFAULT '{}'::jsonb`
  - `exercise_feedback JSONB DEFAULT '{}'::jsonb`
  - `recipe_feedback JSONB DEFAULT '{}'::jsonb`
  - `adjustment_reasons TEXT[] DEFAULT '{}'`
  - `reviewer_confidence NUMERIC CHECK (reviewer_confidence IS NULL OR (reviewer_confidence >= 0.0 AND reviewer_confidence <= 1.0))`
  - `input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `review_context JSONB DEFAULT '{}'::jsonb`
  - `model_metadata JSONB DEFAULT '{}'::jsonb`
  - `status TEXT NOT NULL DEFAULT 'Logged' CHECK (status IN ('Logged', 'Archived', 'Pending', 'completed'))`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

---

## 6. Database Relationship Map

```text
auth.users
   │
   └── 1:1 ── public.profiles
                 │
                 ├── 1:1 ──── public.baseline_onboarding
                 ├── 1:1 ──── public.user_thresholds
                 ├── 1:1 ──── public.user_reminders
                 │
                 ├── 1:N ──── public.care_team_contacts
                 ├── 1:N ──── public.daily_health_logs
                 ├── 1:N ──── public.meal_logs ──────────── N:1 ─── public.recipes
                 ├── 1:N ──── public.exercise_logs ──────── N:1 ─── public.exercise_routines
                 ├── 1:N ──── public.sleep_logs
                 ├── 1:N ──── public.hss_history
                 ├── 1:N ──── public.clinical_alerts
                 ├── 1:N ──── public.patient_notifications ─ N:1 ─── public.system_broadcasts
                 ├── 1:N ──── public.saved_recipes ──────── N:1 ─── public.recipes
                 ├── 1:N ──── public.saved_exercises ────── N:1 ─── public.exercise_routines
                 ├── 1:N ──── public.feedback_tickets
                 │
                 ├── 1:N ──── public.expert_evaluations (as patient user_id or expert_id)
                 ├── 1:N ──── public.calibration_datasets (as created_by)
                 ├── 1:N ──── public.calibration_records (as calibrated_by)
                 ├── 1:N ──── public.admin_notification_reads ─ N:1 ─ public.admin_notifications
                 └── 1:N ──── public.admin_activity_logs (as admin_user_id)
```

---

## 7. User Flows

### 7.1 Patient Flow
1. **Registration & OTP Verification**:
   - Mobile Screens: `app/(auth)/register.tsx` $\rightarrow$ `app/(auth)/verify-otp.tsx` $\rightarrow$ `app/(auth)/verification-success.tsx`.
   - API Calls: `POST /api/auth/request-code` $\rightarrow$ `POST /api/auth/verify-code`.
   - Data Written: Generates registration OTP record in Supabase / AuthService memory; provisions `auth.users` and `public.profiles` on OTP verification.
   - Result: Returns access token, user profile, and redirects to onboarding.
2. **Profile & Baseline Questionnaire**:
   - Mobile Screens: `app/onboarding.tsx` $\rightarrow$ `app/(baseline)/step1_basic_info.tsx` through `step6_health.tsx` $\rightarrow$ `app/(baseline)/calculating.tsx`.
   - API Calls: `POST /api/users/{user_id}/baseline/complete`.
   - Data Written: Inserts `baseline_onboarding`, updates `profiles` (`onboarding_status='complete'`), executes ML scoring engine, inserts initial record in `hss_history`.
   - Result: Displays computed Health Stability Score and redirects to `app/(home)/(tabs)/dashboard.tsx`.
3. **Daily Health Tracking & Logging**:
   - **Vitals & Symptoms**: `app/(home)/(health)/log-symptoms.tsx` $\rightarrow$ `POST /api/health-logs/{user_id}` $\rightarrow$ Writes to `daily_health_logs`.
   - **Meals**: `app/(home)/(meals)/estimate-meal.tsx` / `search-meal.tsx` / `barcode-scan.tsx` $\rightarrow$ `POST /api/meals/{user_id}` $\rightarrow$ Writes to `meal_logs`.
   - **Exercise**: `app/(home)/(tabs)/exercises.tsx` $\rightarrow$ `exercise-details.tsx` $\rightarrow$ `POST /api/exercises/logs/{user_id}` $\rightarrow$ Writes to `exercise_logs` (recording duration in seconds and minutes).
   - **Sleep**: `app/(home)/(health)/log-sleep.tsx` $\rightarrow$ `POST /api/sleep-logs/{user_id}` $\rightarrow$ Writes to `sleep_logs`.
4. **Dashboard & Weekly Review**:
   - Mobile Screens: `app/(home)/(tabs)/dashboard.tsx`, `app/(home)/(tabs)/wrap-up.tsx`, `app/(home)/(health)/analytics.tsx`.
   - API Calls: `GET /api/dashboard/me`, `GET /api/dashboard/wrapup`, `GET /api/analytics/{user_id}`.
   - Data Read: Current HSS score, 7-day adherence telemetry, nutrient aggregates, blood pressure averages.
5. **Settings, Reminders & Care Team**:
   - Mobile Screens: `app/(home)/(settings)/settings.tsx`, `daily-reminders.tsx`, `app/(home)/(profile)/care-team.tsx`, `submit-ticket.tsx`.
   - API Calls: `PUT /api/users/{user_id}/reminders`, `POST /api/users/{user_id}/care-team`, `POST /api/feedback/`.

### 7.2 Admin Flow
1. **Web Authentication**:
   - Screens: `HeartLink-web/src/features/auth/login.jsx` $\rightarrow$ `two-factor.jsx`.
   - API Calls: `POST /api/auth/web-login` $\rightarrow$ `POST /api/auth/web-login/verify-2fa`.
   - Data Read/Written: Verifies credentials, generates 2FA challenge, returns administrative JWT upon code verification.
2. **Administrative Operations**:
   - **Dashboard & KPIs**: `GET /api/admin/dashboard`, `GET /api/admin/analytics`.
   - **User Management**: `GET /api/users/`, `PUT /api/admin/users/{user_id}/status`.
   - **Staff Management (Super Admin)**: `GET /api/admin/staff`, `POST /api/admin/staff`, `PUT /api/admin/staff/{staff_id}/role`.
   - **Announcements**: `GET /api/admin/broadcasts`, `POST /api/admin/broadcasts`, `DELETE /api/admin/broadcasts/{id}`.
   - **Feedback Triage**: `GET /api/feedback/`, `PUT /api/feedback/{ticket_id}`.
   - **Audit Log Review**: `GET /api/admin/activity`.

### 7.3 Medical Expert Flow
1. **Case Review**:
   - Screens: `HeartLink-web/src/features/pages/clinical portal/case_review.jsx`.
   - API Calls: `GET /api/expert/cases` (filters patients with Systolic > 120, Diastolic > 80, or HSS < 50) $\rightarrow$ `GET /api/expert/cases/{user_id}`.
   - Data Read: Anonymized patient baseline, 30-day vitals timeline, symptom frequency, current ML predicted HSS.
2. **Clinical Evaluation & Calibration**:
   - API Calls: `POST /api/expert/cases/{user_id}/evaluate` $\rightarrow$ Writes to `expert_evaluations` and records audit entry.
   - **Calibration Workspace**: `GET /api/expert/calibration/metrics`, `POST /api/expert/datasets/generate`, `GET /api/expert/models`.

---

### 7.4 Storyboard 1: Patient End-to-End Mobile Experience (React Native / Expo)

```text
====================================================================================================
FRAME 1: ONBOARDING & AUTHENTICATION (Mobile)
====================================================================================================
[ 1. Splash Screen ]          [ 2. Phone / Email Reg ]      [ 3. OTP Keypad ]             [ 4. Verification Success ]
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│        HEARTLINK         │  │ Create Account           │  │ Verify Code              │  │        Success!          │
│       [ ♥ Icon ]         │  │ Phone: +63 912 345 6789  │  │ Code sent to phone       │  │     [ ✓ Animated ]        │
│   Cardiovascular Health  │  │ Email: user@domain.com   │  │   [ 8 ] [ 4 ] [ 2 ]      │  │                          │
│     & Lifestyle Tracking │  │ Pass:  ••••••••••••      │  │   [ 1 ] [ 0 ] [ 9 ]      │  │ Account provisioned.     │
│                          │  │                          │  │                          │  │ Profile initialized.     │
│ [ Get Started Button ]   │  │ [ Continue Button ]      │  │ [ Resend in 45s ]        │  │ [ Start Baseline Survey ]│
└──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘

====================================================================================================
FRAME 2: 6-STEP BASELINE LIFESTYLE INTAKE (Mobile)
====================================================================================================
[ Step 1: Biometrics ]        [ Step 2: Activity ]          [ Step 3: Sleep & Smoking ]   [ Step 4: Alcohol & Diet ]
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│ Baseline 1/6: Demographics│ │ Baseline 2/6: Physical   │  │ Baseline 3/6: Habits     │  │ Baseline 4/6: Nutrition  │
│ First Name: Maria        │  │ Vigorous Exercise? [YES] │  │ Avg Sleep Hours: [ 7.5 ] │  │ Fried Food: [Sometimes]  │
│ Date of Birth: 1988-04-12│  │ Days/Wk: [ 3 ] Mins: [45]│  │ Ever Smoked? [NO]        │  │ Salty Food: [Rarely]     │
│ Sex: (•) Female ( ) Male │  │ Moderate Exercise? [YES] │  │                          │  │ Fruit/Veg Servings: [4-5]│
│ Height: 162 cm           │  │ Walk/Bike Transport? [NO]│  │ Sedentary Time: [2-4h]   │  │ Diet Level: [Average]    │
│ Weight: 58 kg            │  │                          │  │                          │  │ Allergies: [Shellfish]   │
│ [ Next: Activity ]       │  │ [ Next: Sleep/Smoking ]  │  │ [ Next: Alcohol/Diet ]   │  │ [ Next: Health History ] │
└──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘

====================================================================================================
FRAME 3: HSS CALCULATION & REVEAL (Mobile)
====================================================================================================
[ Calculation Animation ]                                   [ Initial HSS Score Reveal ]
┌────────────────────────────────────────────────────────┐  ┌────────────────────────────────────────────────────────┐
│               ANALYZING BIOMETRICS...                  │  │                  YOUR HEALTH STABILITY                 │
│                                                        │  │                                                        │
│                    [  ♥ (Pulsing)  ]                   │  │                       ┌───────┐                        │
│                                                        │  │                       │  84   │  TIER: STABLE          │
│          Evaluating CDC NHANES Logistic Pipeline       │  │                       └───────┘  (Score Range: 1-100)  │
│        • 37 Standardized Lifestyle Features Extracted  │  │                                                        │
│        • Risk Probability Computed: 0.162              │  │  "Great job! Your cardiovascular stability indicators  │
│        • Baseline Profile Synchronized to Supabase     │  │   are currently in the optimal range."                 │
│                                                        │  │                                                        │
│                  [ Generating Dashboard... ]           │  │              [ Enter HeartLink Dashboard ]             │
└────────────────────────────────────────────────────────┘  └────────────────────────────────────────────────────────┘

====================================================================================================
FRAME 4: DAILY HEALTH HUB & DASHBOARD (Mobile)
====================================================================================================
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  HEARTLINK                                                              [ Notifications (2) ] [⚙]   │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  ┌──────────────────────────────────────────┐ │
│  │ HEALTH STABILITY SCORE                          │  │ TODAY'S LOGGING QUICK ACTIONS            │ │
│  │   Score: [ 84 / 100 ]   Tier: [ Stable (Green) ]│  │  [+ Log BP]      [+ Log Meal]            │ │
│  │   7-Day Trend:  ▲ +2 pts from last week         │  │  [+ Workout]     [+ Log Sleep]           │ │
│  └─────────────────────────────────────────────────┘  └──────────────────────────────────────────┘ │
│                                                                                                    │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  ┌─────────────────────────┐ │
│  │ BLOOD PRESSURE                │  │ DAILY NUTRITION (SODIUM)      │  │ PHYSICAL ACTIVITY       │ │
│  │   Latest: 118 / 78 mmHg       │  │   1,420 mg / 2,000 mg limit   │  │   35 mins / 30 min goal │ │
│  │   Status: Normal Resting      │  │   Calories: 1,840 kcal        │  │   Adherence: [ Goal Met]│ │
│  └───────────────────────────────┘  └───────────────────────────────┘  └─────────────────────────┘ │
│                                                                                                    │
│  RECOMMENDED HEART-HEALTHY MEALS FOR STABLE TIER                                                   │
│  ┌───────────────────────────────────────────────┐  ┌────────────────────────────────────────────┐ │
│  │ [IMG] Sinigang na Isda (Low Sodium)           │  │ [IMG] Grilled Chicken & Veggie Bowl        │ │
│  │ 320 kcal • 380mg Sodium • 30 mins Prep        │  │ 410 kcal • 420mg Sodium • 20 mins Prep     │ │
│  └───────────────────────────────────────────────┘  └────────────────────────────────────────────┘ │
│                                                                                                    │
│  [ Dashboard ]          [ Recipes ]          [ Exercises ]          [ Wrap-Up ]          [ Profile ]│
└────────────────────────────────────────────────────────────────────────────────────────────────────┘

====================================================================================================
FRAME 5: INTERACTIVE TELEMETRY LOGGERS (Mobile)
====================================================================================================
[ 1. Log Vitals & Symptoms ]  [ 2. Estimate Meal / Scan ]   [ 3. Exercise Workout Timer ] [ 4. Log Sleep ]
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│ Record Vitals & Symptoms │  │ Log Meal                 │  │ Active Routine           │  │ Log Sleep                │
│ Systolic BP:  [ 120 ]    │  │ Search: "Bangus Steamed" │  │ "Brisk Walking (Stable)" │  │ Duration: [ 7.5 hrs ]    │
│ Diastolic BP: [  80 ]    │  │ Portion: [ 1 Serving ]   │  │ Duration: [ 18m 42s ]    │  │ Quality:                 │
│ Heart Rate:   [  72 bpm] │  │ Calories:  240 kcal      │  │ Precision: 1,122 seconds │  │  ( ) Poor   ( ) Fair     │
│ Context: [ Resting ]     │  │ Sodium:    310 mg        │  │ Status: [ Completed ]    │  │  (•) Good   ( ) Excellent│
│ Symptoms Checklist:      │  │ Fiber:     4 g           │  │                          │  │                          │
│  [✓] Mild Palpitation    │  │                          │  │                          │  │                          │
│ [ Save Vitals Log ]      │  │ [ Save Meal Log ]        │  │ [ Finish & Log Workout ] │  │ [ Save Sleep Log ]       │
└──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘

====================================================================================================
FRAME 6: 7-DAY RETROSPECTIVE WRAP-UP & CARE TEAM SAFETY (Mobile)
====================================================================================================
[ 7-Day Retrospective Wrap-Up ]                             [ Care Team & Clinical Contacts ]
┌────────────────────────────────────────────────────────┐  ┌────────────────────────────────────────────────────────┐
│ 7-DAY HEALTH WRAP-UP                                   │  │ CARE TEAM & EMERGENCY CONTACTS                         │
│                                                        │  │                                                        │
│ • Blood Pressure Consistency: 6/7 days in normal range │  │ Primary Cardiologist:                                  │
│ • Sodium Intake Goal Met: 5/7 days                     │  │   Dr. Ramon Santos, MD (Cardiology Specialist)         │
│ • Total Workout Minutes: 185 minutes (Goal: 150m)      │  │   Phone: +63 917 555 0192        [ Call Doctor ]       │
│ • Avg Sleep Duration: 7.2 hours (Good Quality)         │  │                                                        │
│                                                        │  │ Emergency Contact:                                     │
│ Health Stability Score Trend:                          │  │   Elena Magdasal (Spouse)                              │
│   Mon: 82  Tue: 83  Wed: 83  Thu: 84  Fri: 84  Sat: 84 │  │   Phone: +63 918 555 0144        [ Call Emergency ]    │
│                                                        │  │                                                        │
│ [ Share Report with Doctor ]                           │  │ [ Find Nearby Medical Clinics on Map ]                 │
└────────────────────────────────────────────────────────┘  └────────────────────────────────────────────────────────┘
```

---

### 7.5 Storyboard 2: Administrator Management Experience (Web Portal)

```text
====================================================================================================
FRAME 1: ADMINISTRATIVE AUTHENTICATION & 2FA (Web)
====================================================================================================
[ 1. Web Staff Login ]                                      [ 2. Two-Factor Authentication Modal ]
┌────────────────────────────────────────────────────────┐  ┌────────────────────────────────────────────────────────┐
│ HEARTLINK ADMINISTRATIVE PORTAL                        │  │ TWO-FACTOR SECURITY VERIFICATION                       │
│                                                        │  │                                                        │
│ Email / Identifier: [ admin@heartlink.health         ] │  │ A verification code was generated for your session.     │
│ Password:           [ ••••••••••••••••••••••••••     ] │  │                                                        │
│ [✓] Remember session                                   │  │ Enter 6-digit 2FA Code:                                │
│                                                        │  │ [ 4 ] [ 9 ] [ 1 ] [ 0 ] [ 3 ] [ 8 ]                    │
│ [ Sign In to Staff Console ]                           │  │                                                        │
│                                                        │  │ [ Verify & Access Console ]                            │
└────────────────────────────────────────────────────────┘  └────────────────────────────────────────────────────────┘

====================================================================================================
FRAME 2: EXECUTIVE COMMAND CENTER & PLATFORM ANALYTICS (Web)
====================================================================================================
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEARTLINK ADMIN      [ Dashboard ] [ Users ] [ Staff ] [ Broadcasts ] [ Feedback ] [ Audit Logs ]  │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PLATFORM HEALTH OVERVIEW                                                                           │
│ ┌────────────────────────┐  ┌────────────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│ │ TOTAL PATIENTS         │  │ 7-DAY ACTIVE USERS      │  │ PLATFORM AVG HSS │  │ OPEN ALERTS      │ │
│ │ 1,248 (+12% this mo)   │  │ 942 Active Loggers      │  │ 76.4 (Moderate)  │  │ 3 Under Review   │ │
│ └────────────────────────┘  └────────────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                                                    │
│ HSS POPULATION DISTRIBUTION                              WEEKLY LOGGING TELEMETRY STREAM           │
│ ┌─────────────────────────────────────────────────────┐  ┌───────────────────────────────────────┐ │
│ │ Stable (80-100):        ■■■■■■■■■■■■■■■■  52% (648) │  │ Meal Logs:       3,410 logged         │ │
│ │ Moderate (60-79):       ■■■■■■■■■■        31% (386) │  │ Workouts:        2,120 sessions       │ │
│ │ Elevated Risk (50-59):  ■■■■              12% (150) │  │ Vitals & BP:     1,890 entries        │ │
│ │ Critical (1-49):        ■                  5%  (64) │  │ Sleep Records:   3,100 logs           │ │
│ └─────────────────────────────────────────────────────┘  └───────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘

====================================================================================================
FRAME 3: USER GOVERNANCE & STAFF PROVISIONING (Web)
====================================================================================================
[ Patient & Staff Directory ]                               [ SuperAdmin Staff Provisioning Modal ]
┌────────────────────────────────────────────────────────┐  ┌────────────────────────────────────────────────────────┐
│ USER MANAGEMENT DIRECTORY                              │  │ PROVISION NEW STAFF ACCOUNT (Super Admin Only)         │
│ Search: [ Maria Santos            ] Filter: [ All    ] │  │                                                        │
│ ┌──────────────────┬──────────────┬────────┬─────────┐ │  │ Full Name:     [ Dr. Alejandro Cruz                  ] │
│ │ Name / Email     │ Role         │ HSS    │ Status  │ │  │ Email:         [ acruz@hospital.org                  ] │
│ ├──────────────────┼──────────────┼────────┼─────────┤ │  │ Phone:         [ +63 917 555 9812                    ] │
│ │ Maria Santos     │ Patient      │ 84 (St)│ ACTIVE  │ │  │ Assigned Role: (•) Medical Expert  ( ) System Admin    │
│ │ Juan dela Cruz   │ Patient      │ 48 (Cr)│ ACTIVE  │ │  │                                                        │
│ │ Dr. Ramos, MD    │ MedicalExpert│ --     │ ACTIVE  │ │  │ Default credentials and permissions will be generated. │
│ └──────────────────┴──────────────┴────────┴─────────┘ │  │                                                        │
│ [ Toggle Status (Active/Disabled) ] [ View Timeline ]  │  │ [ Provision Staff Account ]       [ Cancel ]            │
└────────────────────────────────────────────────────────┘  └────────────────────────────────────────────────────────┘

====================================================================================================
FRAME 4: SYSTEM BROADCAST COMPOSER & IMMUTABLE AUDIT LOG (Web)
====================================================================================================
[ Broadcast Announcement Composer ]                         [ Immutable Admin Activity Audit Stream ]
┌────────────────────────────────────────────────────────┐  ┌────────────────────────────────────────────────────────┐
│ PUBLISH SYSTEM ANNOUNCEMENT                            │  │ ADMINISTRATIVE ACTIVITY AUDIT LOG (Append-Only)        │
│                                                        │  │                                                        │
│ Title:     [ Scheduled Maintenance Notice            ] │  │ ┌───────────┬──────────────┬────────────┬─────────────┐│
│ Category:  [ Maintenance ▼ ] Audience: [ All Accounts] │  │ │ Timestamp │ Administrator│ Action     │ Target Name ││
│ Message:   [ Backend sync will be offline from 2AM to│ │  │ ├───────────┼──────────────┼────────────┼─────────────┤│
│            │ 4AM PHT on Sunday for schema updates.   ] │  │ │ 12:15 UTC  │ super_admin  │ created    │ Dr. A. Cruz ││
│                                                        │  │ │ 11:40 UTC  │ admin_user   │ published  │ Maint Notice││
│ [ Live Preview in Patient Inbox ]                      │  │ │ 10:12 UTC  │ admin_user   │ disabled   │ usr-9418    ││
│ [ Publish & Push to Inboxes ]                          │  │ └───────────┴──────────────┴────────────┴─────────────┘│
└────────────────────────────────────────────────────────┘  └────────────────────────────────────────────────────────┘
```

---

### 7.6 Storyboard 3: Medical Expert Clinical Case Review Experience (Web Portal)

```text
====================================================================================================
FRAME 1: CLINICAL TRIAGE QUEUE (Medical Expert)
====================================================================================================
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEARTLINK CLINICAL PORTAL        [ Case Review Queue ] [ Calibration Studio ] [ Model Registry ]    │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FLAGGED CLINICAL CASES (Trigger Criteria: Systolic > 120 OR Diastolic > 80 OR HSS < 50)             │
│ Search Case ID: [ CASE-                   ]  Status Filter: [ Pending Review (4) ▼ ]               │
│ ┌──────────────┬─────┬────────┬───────────────┬───────────────┬────────────────┬─────────────────┐ │
│ │ Case ID      │ Age │ Sex    │ Blood Pressure│ ML Pred HSS   │ Review Status  │ Action          │ │
│ ├──────────────┼─────┼────────┼───────────────┼───────────────┼────────────────┼─────────────────┤ │
│ │ CASE-B49102  │ 54  │ Male   │ 148 / 92 mmHg │ 44 (Critical) │ Pending Review │ [ Review Case ] │ │
│ │ CASE-C10984  │ 61  │ Female │ 136 / 88 mmHg │ 52 (Elevated) │ Pending Review │ [ Review Case ] │ │
│ │ CASE-A88219  │ 49  │ Male   │ 128 / 82 mmHg │ 62 (Moderate) │ Evaluated      │ [ View Review ] │ │
│ └──────────────┴─────┴────────┴───────────────┴───────────────┴────────────────┴─────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘

====================================================================================================
FRAME 2: ANONYMIZED PATIENT CLINICAL SNAPSHOT & TIMELINE (Medical Expert)
====================================================================================================
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CASE REVIEW: CASE-B49102  (Age: 54 | Sex: Male)                                 [ Back to Queue ]   │
├──────────────────────────────────────────────────┬─────────────────────────────────────────────────┤
│ PATIENT CLINICAL TELEMETRY SNAPSHOT              │ MODEL INFERENCE CONTEXT                         │
│ • Baseline Resting BP:     148 / 92 mmHg         │ • Model Version: NHANES Logistic Pipeline v1.0  │
│ • Baseline Resting HR:     86 bpm                │ • Predicted Risk Probability: 0.582             │
│ • Reported Symptoms:       Chest Tightness (2x)  │ • Model Predicted HSS: 44 (Critical Tier)       │
│ • Sedentary Time:          8+ hours daily        │ • Primary Risk Drivers: High BP, Low Activity   │
│ • Salt / Fried Frequency:  Daily / Often         │                                                 │
│ • 30-Day Vitals Timeline:  BP Avg 144/90 (High)  │ Current Recommendations:                        │
│ • Physical Activity:       0 days / week         │   - Low Sodium Fish Sinigang (Recipe)           │
│                                                  │   - Gentle Seated Mobility (Exercise Routine)   │
└──────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

====================================================================================================
FRAME 3: EXPERT ADJUDICATION & EVALUATION SUBMISSION (Medical Expert)
====================================================================================================
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ EXPERT CLINICAL ADJUDICATION                                                                       │
│                                                                                                    │
│ 1. Expert HSS Score Assignment (1 - 100):                                                          │
│    [ Slider: ───────●────────────────────────────────────── ]  Assigned Score: [ 42 ] (Critical)   │
│                                                                                                    │
│ 2. Clinical Agreement & Adjustment Reasons:                                                        │
│    [✓] High resting blood pressure burden confirmed                                                │
│    [✓] High sedentary duration without compensating cardio activity                                │
│    [✓] Agreement with ML Critical classification (Absolute Score Difference: 2 pts)                │
│                                                                                                    │
│ 3. Recommendation Appropriateness:                                                                 │
│    Recipe Recommendation:    [✓ Valid & Safe]   Exercise Recommendation: [✓ Valid & Safe]          │
│                                                                                                    │
│ 4. Clinical Review Notes:                                                                          │
│    [ Patient exhibits stage 2 hypertension indicators paired with sedentary lifestyle.            ]│
│    [ Recommend primary care physician referral and continued daily BP monitoring.                 ]│
│                                                                                                    │
│ Reviewer Confidence: (•) High  ( ) Medium  ( ) Low                                                 │
│                                                                                                    │
│ [ Submit Expert Evaluation & Log Audit Record ]                                                    │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘

====================================================================================================
FRAME 4: CALIBRATION ANALYTICS & DATASET GENERATION STUDIO (Medical Expert / Admin)
====================================================================================================
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MODEL CALIBRATION & CONTINUOUS LEARNING STUDIO                                                     │
├──────────────────────────────────────────────────┬─────────────────────────────────────────────────┤
│ CALIBRATION PERFORMANCE METRICS                  │ VERSIONED RETRAINING DATASETS                   │
│ • Total Evaluated Cases:     124                 │ ┌──────────────────┬───────────┬──────────────┐ │
│ • Mean Absolute Error (MAE): 3.84 pts            │ │ Dataset ID       │ Records   │ Created At   │ │
│ • Tier Agreement Rate:       92.7%               │ ├──────────────────┼───────────┼──────────────┤ │
│ • Tier Disagreements:        9 cases             │ │ dataset-2026-001 │ 100 rows  │ 2026-08-20   │ │
│                                                  │ │ dataset-2026-002 │ 124 rows  │ 2026-08-26   │ │
│ Error Distribution Breakdown:                    │ └──────────────────┴───────────┴──────────────┘ │
│   < 5 pts error:   ■■■■■■■■■■■■■■  82 cases      │                                                 │
│   5 - 9 pts error: ■■■■            28 cases      │ [ Generate New Training Dataset from Evals ]    │
│   10-14 pts error: ■■              10 cases      │                                                 │
│   >= 15 pts error: ▍                4 cases      │ [ Register ML Candidate Model Artifact ]        │
└──────────────────────────────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 8. Core API Endpoints

### 8.1 Authentication (`/api/auth`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/request-code` | None | Anon | Request registration OTP | `RegisterRequest` (`phone`, `email`, `password`) | `{"success": true, "message": "..."}` | AuthService / Supabase Auth |
| `POST` | `/api/auth/resend-code` | None | Anon | Resend OTP code | `ResendCodeRequest` (`phone`) | `{"success": true, "message": "..."}` | AuthService |
| `POST` | `/api/auth/verify-code` | None | Anon | Verify OTP & provision account | `CodeResponse` (`phone`, `code`) | `{"access_token": "...", "user": {...}}` | `profiles` & `auth.users` |
| `POST` | `/api/auth/login` | None | Anon | Mobile user password login | `Login` (`identifier`, `password`) | `{"access_token": "...", "user": {...}}` | `profiles` & `auth.users` |
| `POST` | `/api/auth/web-login` | None | Anon | Web staff login (initiates 2FA) | `Login` (`identifier`, `password`, `remember`) | `{"require_2fa": true, "token_2fa": "..."}` | `profiles` |
| `POST` | `/api/auth/web-login/verify-2fa` | None | Anon | Complete web 2FA challenge | `WebVerify2FA` (`token_2fa`, `code`) | `{"access_token": "...", "user": {...}}` | AuthService |
| `POST` | `/api/auth/forgot-password` | None | Anon | Request password recovery | `ForgotPasswordRequest` (`identifier`) | Uniform non-enumerating confirmation | `profiles` / Supabase Auth |
| `POST` | `/api/auth/logout` | Bearer | Any | Invalidate active JWT | None (Bearer header) | `{"success": true, "message": "..."}` | `token_blacklist` |

### 8.2 Users & Profiles (`/api/users`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/users/` | Bearer | Admin/Expert | List all users with HSS & activity | None | `List[EnrichedUserProfile]` | `profiles`, `hss_history`, logs |
| `GET` | `/api/users/{user_id}/profile` | Bearer | Owner/Staff | Get complete user profile & baselines | None | `FullProfileResponse` | `profiles`, `baseline_onboarding` |
| `PUT` | `/api/users/{user_id}/profile` | Bearer | Owner/SuperAdmin| Update user profile biometrics/goals | `ProfileUpdate` | `{"success": true, "data": {...}}` | `profiles` |
| `PUT` | `/api/users/{user_id}/password` | Bearer | Owner | Change account password | `ChangePasswordRequest` | `{"success": true, "message": "..."}` | `profiles` / `auth.users` |
| `DELETE` | `/api/users/{user_id}` | Bearer | Owner/SuperAdmin| Permanently delete account | `DeleteAccountRequest` (`password`) | `{"success": true, "message": "..."}` | `profiles` (Cascades all data) |
| `POST` | `/api/users/{user_id}/baseline/complete`| Bearer | Owner | Save baseline survey & compute HSS | `BaselineOnboardingRequest` | `{"success": true, "initial_hss": {...}}` | `baseline_onboarding`, `hss_history`|
| `GET` | `/api/users/{user_id}/reminders` | Bearer | Owner/Staff | Retrieve daily reminder schedule | None | `RemindersResponse` | `user_reminders` |
| `PUT` | `/api/users/{user_id}/reminders` | Bearer | Owner | Update daily reminder schedule | `RemindersUpdateRequest` | `{"success": true, "data": {...}}` | `user_reminders` |
| `POST` | `/api/users/{user_id}/care-team` | Bearer | Owner | Add care team contact | `CareTeamContactRequest` | `{"success": true, "data": {...}}` | `care_team_contacts` |
| `PUT` | `/api/users/{user_id}/care-team/{id}` | Bearer | Owner | Update care team contact | `CareTeamContactRequest` | `{"success": true, "data": {...}}` | `care_team_contacts` |
| `DELETE`| `/api/users/{user_id}/care-team/{id}` | Bearer | Owner | Delete care team contact | None | `{"success": true, "message": "..."}` | `care_team_contacts` |

### 8.3 Dashboard (`/api/dashboard`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/me` | Bearer | Patient | User dashboard telemetry summary | None | `DashboardData` | `hss_history`, logs, content |
| `GET` | `/api/dashboard/wrapup` | Bearer | Patient | 7-day retrospective health wrap-up | None (`local_date` query) | `WrapUpData` | `hss_history`, logs, thresholds |

### 8.4 Health Tracking (`/api/health-logs`, `/api/meals`, `/api/exercises`, `/api/sleep-logs`, `/api/analytics`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/health-logs/{user_id}` | Bearer | Owner/Staff | List daily vitals and symptoms logs | None | `List[HealthLog]` | `daily_health_logs` |
| `POST` | `/api/health-logs/{user_id}` | Bearer | Owner | Record vitals & symptoms | `HealthLogCreate` | `{"success": true, "data": {...}}` | `daily_health_logs`, alerts |
| `DELETE`| `/api/health-logs/{user_id}/{id}`| Bearer | Owner | Delete health log entry | None | `{"success": true, "message": "..."}` | `daily_health_logs` |
| `GET` | `/api/meals/{user_id}` | Bearer | Owner/Staff | List logged meals | None | `List[MealLog]` | `meal_logs` |
| `POST` | `/api/meals/{user_id}` | Bearer | Owner | Log a meal (supports alias resolution)| `MealLogCreate` | `{"success": true, "data": {...}}` | `meal_logs` |
| `DELETE`| `/api/meals/{user_id}/{meal_id}` | Bearer | Owner | Delete meal log entry | None | `{"success": true, "message": "..."}` | `meal_logs` |
| `GET` | `/api/meals/search` | None | Any | Search meal nutrition library | `q` query | `List[MealSearchResult]` | Nutrition DB |
| `GET` | `/api/meals/filipino-foods` | None | Any | Search Filipino dishes DB | `q` query | `List[FilipinoFoodItem]` | Filipino Food DB |
| `GET` | `/api/exercises/logs/{user_id}`| Bearer | Owner/Staff | List exercise workout history | None (`limit`, `offset` query) | `List[ExerciseLog]` | `exercise_logs` |
| `POST` | `/api/exercises/logs/{user_id}`| Bearer | Owner | Record workout (seconds + minutes) | `ExerciseLogCreate` | `{"success": true, "data": {...}}` | `exercise_logs` |
| `DELETE`| `/api/exercises/logs/{user_id}/{id}`| Bearer | Owner | Delete exercise log | None | `{"success": true, "message": "..."}` | `exercise_logs` |
| `GET` | `/api/sleep-logs/{user_id}` | Bearer | Owner/Staff | List sleep logs | None | `List[SleepLog]` | `sleep_logs` |
| `POST` | `/api/sleep-logs/{user_id}` | Bearer | Owner | Record sleep duration & quality | `SleepLogCreate` | `{"success": true, "data": {...}}` | `sleep_logs` |
| `DELETE`| `/api/sleep-logs/{user_id}/{id}`| Bearer | Owner | Soft-delete sleep log | None | `{"success": true, "message": "..."}` | `sleep_logs` |
| `GET` | `/api/analytics/{user_id}` | Bearer | Owner/Staff | Fetch 30-day analytics & thresholds | None | `AnalyticsData` | `hss_history`, logs, thresholds |
| `PUT` | `/api/analytics/{user_id}/thresholds`| Bearer | Owner | Update user clinical thresholds | `ThresholdsUpdateRequest` | `{"success": true, "data": {...}}` | `user_thresholds` |

### 8.5 Recipes, Routines & Clinics (`/api/recipes`, `/api/exercises`, `/api/clinics`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/recipes/` | Optional | Public/Staff | List recipes (filtered if unauthenticated)| None | `List[Recipe]` | `recipes` |
| `GET` | `/api/recipes/{recipe_id}` | None | Any | Get single recipe details | None | `Recipe` | `recipes` |
| `POST` | `/api/recipes/` | Bearer | Admin | Create recipe | `RecipeCreate` | `Recipe` | `recipes` |
| `PUT` | `/api/recipes/{recipe_id}` | Bearer | Admin | Update recipe / status | `RecipeUpdate` | `Recipe` | `recipes` |
| `DELETE`| `/api/recipes/{recipe_id}` | Bearer | Admin | Delete recipe | None | `{"success": true, "message": "..."}` | `recipes` |
| `GET` | `/api/recipes/saved/{user_id}` | Bearer | Owner | List user saved recipe bookmarks | None | `List[Recipe]` | `saved_recipes`, `recipes` |
| `GET` | `/api/exercises/` | Optional | Public/Staff | List routines (filtered if unauthenticated)| None | `List[ExerciseRoutine]` | `exercise_routines` |
| `GET` | `/api/exercises/{routine_id}` | Optional | Public/Staff | Get single exercise routine | None | `ExerciseRoutine` | `exercise_routines` |
| `POST` | `/api/exercises/` | Bearer | Admin | Create routine | `RoutineCreate` | `ExerciseRoutine` | `exercise_routines` |
| `PUT` | `/api/exercises/{routine_id}` | Bearer | Admin | Update routine | `RoutineUpdate` | `ExerciseRoutine` | `exercise_routines` |
| `DELETE`| `/api/exercises/{routine_id}` | Bearer | Admin | Delete routine | None | `{"success": true, "message": "..."}` | `exercise_routines` |
| `GET` | `/api/clinics` | None | Any | List medical clinics directory | None | `List[Clinic]` | `clinics` |

### 8.6 Notifications & Broadcasts (`/api/notifications`, `/api/admin/notifications`, `/api/admin/broadcasts`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications/{user_id}`| Bearer | Owner | List patient inbox notifications | None | `List[PatientNotification]` | `patient_notifications` |
| `PUT` | `/api/notifications/{id}/read`| Bearer | Owner/Admin | Mark patient notification as read | None | `{"success": true}` | `patient_notifications` |
| `PUT` | `/api/notifications/{user_id}/mark-all-read`| Bearer | Owner | Mark all notifications read | None | `{"success": true}` | `patient_notifications` |
| `GET` | `/api/notifications/broadcasts`| None | Any | List active public broadcasts | None | `List[SystemBroadcast]` | `system_broadcasts` |
| `GET` | `/api/admin/notifications` | Bearer | Admin/Super | List operational admin notifications | None | `{"notifications": [...], "unread_count": N}` | `admin_notifications`, reads |
| `PUT` | `/api/admin/notifications/{id}/read`| Bearer | Admin/Super | Mark admin notification as read | None | `{"success": true}` | `admin_notification_reads` |
| `PUT` | `/api/admin/notifications/mark-all-read`| Bearer| Admin/Super | Mark all admin notifications read | None | `{"success": true, "unread_count": 0}` | `admin_notification_reads` |
| `GET` | `/api/admin/broadcasts` | Bearer | Admin/Super | List broadcasts for admin management | None | `List[SystemBroadcast]` | `system_broadcasts` |
| `POST` | `/api/admin/broadcasts` | Bearer | Admin/Super | Create and publish broadcast announcement| `BroadcastCreate` | `{"status": "success", "data": {...}}` | `system_broadcasts`, inbox fan-out |
| `DELETE`| `/api/admin/broadcasts/{id}` | Bearer | Admin/Super | Delete broadcast announcement | None | `{"status": "success", "message": "..."}` | `system_broadcasts` |

### 8.7 Feedback (`/api/feedback`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/feedback/` | Bearer | Admin/Super | List feedback tickets | None | `List[FeedbackTicket]` | `feedback_tickets` |
| `POST` | `/api/feedback/` | Bearer | Any Active | Submit support/bug feedback ticket | `TicketCreate` | `FeedbackTicket` | `feedback_tickets`, admin alert |
| `PUT` | `/api/feedback/{ticket_id}` | Bearer | Admin/Super | Update feedback status & notes | `TicketUpdate` | `FeedbackTicket` | `feedback_tickets` |

### 8.8 Administration & Staff (`/api/admin`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Bearer | Admin/Super | Admin dashboard overview metrics | None | `AdminDashboardKPI` | Aggregate queries across all tables |
| `GET` | `/api/admin/analytics` | Bearer | Admin/Super | System analytics and demographics | `period` query | `AdminAnalyticsData` | Aggregate queries |
| `GET` | `/api/admin/staff` | Bearer | SuperAdmin | List system staff accounts | None | `List[StaffAccount]` | `profiles` |
| `POST` | `/api/admin/staff` | Bearer | SuperAdmin | Provision new staff account | `StaffCreate` | `{"status": "success", "id": "..."}` | `profiles` |
| `PUT` | `/api/admin/users/{user_id}/status`| Bearer | Admin/Super | Toggle user status (active/disabled) | None | `{"status": "success", "new_status": "..."}`| `profiles` |
| `PUT` | `/api/admin/staff/{staff_id}/role` | Bearer | SuperAdmin | Modify staff role (expert/admin) | `{"role": "..."}` | `{"status": "success", "new_role": "..."}` | `profiles` |
| `GET` | `/api/admin/users/{user_id}/timeline`| Bearer | Admin/Super | Unified patient clinical timeline | None | `List[TimelineEvent]` | Vitals, meals, exercises, sleep |
| `GET` | `/api/admin/activity` | Bearer | Admin/Super | Paginated immutable audit logs | `page`, `page_size`, filters | `{"items": [...], "total": N, ...}` | `admin_activity_logs` |

### 8.9 Medical Expert & Case Review (`/api/expert` & `/api/admin`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Data Source |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/expert/cases` | Bearer | Admin/Expert | List flagged clinical cases for review | None | `List[CaseItem]` | Trigger queries on `profiles`, vitals, HSS |
| `GET` | `/api/expert/cases/{user_id}` | Bearer | Admin/Expert | Get anonymized clinical case detail | None | `CaseDetail` | Baselines, timeline, recommendations |
| `POST` | `/api/expert/cases/{user_id}/evaluate`| Bearer| MedicalExpert| Submit expert evaluation on case | `EvaluationPayload` | `{"status": "success", "evaluation": {...}}`| `expert_evaluations` |
| `GET` | `/api/expert/evaluations` | Bearer | Admin/Expert | List all clinical evaluations | None | `List[Evaluation]` | `expert_evaluations` |
| `GET` | `/api/expert/evaluations/{id}`| Bearer | Admin/Expert | Get single evaluation details | None | `Evaluation` | `expert_evaluations` |
| `PUT` | `/api/expert/evaluations/{id}/archive`| Bearer| Admin/Expert | Archive an evaluation | None | `{"status": "success", "evaluation": {...}}`| `expert_evaluations` |
| `GET` | `/api/expert/calibration/metrics`| Bearer | Admin/Expert | Calibration analytics & MAE stats | None | `CalibrationMetrics` | `expert_evaluations` |
| `POST` | `/api/expert/datasets/generate`| Bearer | Admin/Expert | Export versioned ML dataset | `DatasetFilter` | `{"status": "success", "dataset": {...}}` | `calibration_datasets` |
| `GET` | `/api/expert/datasets` | Bearer | Admin/Expert | List versioned training datasets | None | `List[DatasetMeta]` | `calibration_datasets` |
| `GET` | `/api/expert/datasets/{id}` | Bearer | Admin/Expert | Get specific dataset rows | None | `DatasetDetail` | `calibration_datasets` |
| `GET` | `/api/expert/models` | Bearer | Admin/Expert | List registered ML candidate models | None | `List[CandidateModel]`| `candidate_models` |
| `POST` | `/api/expert/models` | Bearer | Admin/Expert | Register new ML candidate model | `ModelRegisterPayload`| `{"status": "success", "model": {...}}` | `candidate_models` |
| `PUT` | `/api/expert/models/{id}/status`| Bearer | Admin/Expert | Update model candidate status | `{"status": "..."}` | `{"status": "success", "model": {...}}` | `candidate_models` |
| `POST` | `/api/expert/retrain` | Bearer | Admin/Expert | Static ML notice endpoint | None | Returns HTTP 501 (Retraining is offline)| N/A |

### 8.10 File Uploads (`/api/upload`)
| Method | Endpoint | Auth | Role | Purpose | Request Body | Response | Storage Target |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/upload/` | Bearer | Any Active | Upload avatar or content asset | Multipart Form (`file`, `bucket`, `target_id`) | `{"url": "...", "filename": "..."}` | Supabase Storage (`avatars`, `recipes`, `exercises`) |

---

## 9. API Authorization Matrix

| Endpoint Group | Anonymous | Patient | Medical Expert | Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Auth Gateway (`/api/auth/*`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own Profile & Settings (`/api/users/{self}/*`) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Baseline Questionnaire (`/api/users/{self}/baseline/*`)| ❌ | ✅ | ❌ | ❌ | ❌ |
| Own Health Telemetry Logs (`/api/health-logs/{self}`, etc.) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Dashboard & Weekly Wrap-Up (`/api/dashboard/*`) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Patient Notifications Inbox (`/api/notifications/{self}`) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Public Content & Directory (`/api/recipes`, `/api/clinics`)| ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit Feedback (`/api/feedback/`) | ❌ | ✅ | ✅ | ✅ | ✅ |
| User Management & Status Toggle (`/api/admin/users/*`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Content Creation / Deletion (`/api/recipes/`, etc.) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin Announcements & Broadcasts (`/api/admin/broadcasts`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Operational Admin Notifications (`/api/admin/notifications`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin Activity Audit Log (`/api/admin/activity`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Case Review Queue & Anonymized Details (`/api/expert/cases`)| ❌ | ❌ | ✅ | ✅ | ✅ |
| Submit Case Evaluation (`/api/expert/cases/{id}/evaluate`)| ❌ | ❌ | ✅ | ❌ | ❌ |
| Datasets & ML Candidate Models (`/api/expert/datasets/*`)| ❌ | ❌ | ❌ | ✅ | ✅ |
| Staff Account Provisioning (`/api/admin/staff`) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Staff Role Modifications (`/api/admin/staff/{id}/role`)| ❌ | ❌ | ❌ | ❌ | ✅ |
| Avatar File Upload (`/api/upload/` -> `avatars`) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Content File Upload (`/api/upload/` -> `recipes`/`exercises`)| ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 10. Frontend ↔ API Contracts

### End-to-End Pipeline Trace

```text
Frontend Screen / Component
           │
           ▼
API Service Call (fetch / apiFetch)
           │
           ▼
FastAPI Router & Pydantic Validation
           │
           ▼
Domain Repository (app/db/repositories/)
  • UUID Resolution (resolve_uuid helper)
  • Column Whitelist Filtering
  • PostgreSQL Error Sanitization
           │
           ▼
Supabase PostgreSQL Table / RLS
           │
           ▼
JSON Response Payload
           │
           ▼
Client State / React Context Hydration
```

### Key Domain Pipelines

1. **Patient Login Flow**:
   - `HeartLink-mobile/app/(auth)/login.tsx` $\rightarrow$ `POST /api/auth/login` $\rightarrow$ Validates identifier/password $\rightarrow$ `SupabaseAuthService` $\rightarrow$ Returns JWT & User Object $\rightarrow$ Mobile saves `access_token`, hydrates `UserContext`, caches profile to `@user_profile_cache`.
2. **Baseline Onboarding Flow**:
   - `HeartLink-mobile/app/(baseline)/step1...step6` $\rightarrow$ `POST /api/users/{user_id}/baseline/complete` $\rightarrow$ `BaselineOnboardingRequest` $\rightarrow$ `compute_initial_hss()` ML engine $\rightarrow$ `SupabaseBaselineRepository` inserts `baseline_onboarding` & `SupabaseHSSRepository` inserts `hss_history` $\rightarrow$ Returns calculated score and tier $\rightarrow$ Sets `onboarding_status='complete'` $\rightarrow$ Navigates to Dashboard.
3. **Health Vitals Logging Flow**:
   - `HeartLink-mobile/app/(home)/(health)/log-symptoms.tsx` $\rightarrow$ `POST /api/health-logs/{user_id}` $\rightarrow$ Boundary check on BP & HR $\rightarrow$ `SupabaseHealthLogsRepository` $\rightarrow$ Inserts `daily_health_logs` $\rightarrow$ Checks for threshold breach $\rightarrow$ Creates `clinical_alerts` if out of bounds.
4. **Meal Logging Flow**:
   - `HeartLink-mobile/app/(home)/(meals)/estimate-meal.tsx` $\rightarrow$ `POST /api/meals/{user_id}` $\rightarrow$ Canonicalizes `food_name` / `name` to `meal_name` $\rightarrow$ `SupabaseMealsRepository` filters non-schema keys $\rightarrow$ Inserts `meal_logs`.
5. **Exercise Logging Flow**:
   - `HeartLink-mobile/app/(home)/(tabs)/exercises.tsx` $\rightarrow$ `POST /api/exercises/logs/{user_id}` $\rightarrow$ Validates `duration_seconds` and `duration_minutes` $\rightarrow$ `SupabaseExercisesRepository` $\rightarrow$ Inserts `exercise_logs` $\rightarrow$ Updates Dashboard adherence.
6. **Clinical Case Review & Evaluation Flow**:
   - `HeartLink-web/src/features/pages/clinical portal/case_review.jsx` $\rightarrow$ `GET /api/expert/cases` $\rightarrow$ Renders reviewable cases meeting clinical trigger criteria $\rightarrow$ Expert selects case $\rightarrow$ `GET /api/expert/cases/{user_id}` $\rightarrow$ Expert submits evaluation $\rightarrow$ `POST /api/expert/cases/{user_id}/evaluate` $\rightarrow$ `SupabaseCaseReviewRepository` inserts `expert_evaluations` $\rightarrow$ `SupabaseAdminRepository` writes audit record to `admin_activity_logs`.

### ID Format Resolution
- **Internal Database Standard**: Native `UUID` (`gen_random_uuid()` or Supabase Auth UUIDs).
- **Legacy Mock ID Support**: Repository helper `resolve_uuid(identifier)` transparently maps legacy test identifiers (e.g., `usr-patient-101`, `usr-admin-001`, `usr-expert-001`, `rec-001`, `ex-001`) to their authentic database UUIDs via lookup on `legacy_id` columns, preventing PostgREST UUID syntax failures.

---

## 11. Core Business Rules

1. **Baseline Survey Requirements**:
   - A user cannot complete the baseline onboarding questionnaire until core demographic and biometric identity (`first_name`, `date_of_birth`, `sex`, `height_cm`, `weight_kg`) is populated on `profiles`.
2. **Account Status Hierarchy**:
   - Accounts have one of three statuses: `'active'`, `'disabled'`, or `'archived'`.
   - Disabled or archived accounts are immediately denied API access on all authenticated endpoints.
   - Deleting an account initiates a permanent cascade deletion of all related clinical telemetry, bookmarks, baseline data, and notifications.
3. **Password Security Requirements**:
   - Changing password or deleting account requires verification of the user's current password.
   - Password reset via `POST /api/auth/forgot-password` always returns a generic response to prevent account enumeration attacks.
4. **Health Stability Score (HSS) Rules**:
   - HSS scores are integer values strictly bounded between 1 and 100.
   - Unscored or newly registered users with incomplete baseline data are explicitly rendered as `"Pending"` rather than assigned fabricated default scores.
5. **Admin Notification Isolation**:
   - Operational notifications destined for administrators (`admin_notifications`) are structurally isolated from patient inbox notifications (`patient_notifications`).
   - Read states for administrative notifications are normalized in `admin_notification_reads` so that one administrator marking a notification read does not alter read states for other administrators.
6. **Audit Log Immutability**:
   - The `admin_activity_logs` table is strictly append-only. Any attempt by application code or database administrators to execute `UPDATE` or `DELETE` on this table raises a PostgreSQL exception via the `deny_activity_log_modification` trigger.
7. **Storage Upload Constraints**:
   - Files are validated for MIME type (`image/jpeg`, `image/png`, `image/webp`, and `video/mp4` for exercises) and file size (2 MB for avatars, 5 MB for recipes, 20 MB for exercises) prior to storage insertion.

---

## 12. HSS / Clinical Data Contract

### Score Scale and Tier Classifications

| Tier | HSS Score Range | Clinical Wellness Description | Color Coding / UI Badge |
| :--- | :---: | :--- | :--- |
| **Stable** | 80 – 100 | Optimal cardiovascular metrics; low lifestyle risk | Green (`#22C55E` / `#059669`) |
| **Moderate** | 60 – 79 | Mild risk indicators; lifestyle adherence recommended | Amber / Orange (`#F59E0B`) |
| **Elevated Risk** | 50 – 59 | Notable risk factors present; clinical monitoring suggested | Orange / Deep Orange (`#EA580C`) |
| **Critical** | 1 – 49 | Severe risk factors; immediate clinical attention warranted | Red (`#EF4444` / `#DC2626`) |

### Machine Learning Model Architecture
- **Model Engine**: Logistic Regression pipeline (`heartlink_model.pkl`) trained on CDC NHANES cardiovascular lifestyle survey datasets.
- **Feature Transformation**: Raw onboarding questionnaire responses and core biometrics are transformed into 37 standardized NHANES numerical and categorical features (`app/services/feature_transform.py`).
- **Score Calculation Formula**:
  $$P(\text{risk}) = \text{predict\_proba}(\mathbf{x})[1]$$
  $$\text{HSS} = \max\left(1, \min\left(100, \text{round}\left((1 - P(\text{risk})) \times 99\right) + 1\right)\right)$$
- **Score Source Attribution**: Every record in `hss_history` records its origin: `'baseline'` (initial survey), `'telemetry'` (updated via longitudinal health logs), or `'expert_override'` (clinical expert assessment).

### Known Contract Discrepancies
- **Clinical Trigger Criteria for Case Review**: While general HSS categorization defines `'Critical'` as $<50$, the Medical Expert Case Review queue (`/api/expert/cases`) flags cases for evaluation using a composite clinical trigger: **Systolic BP $> 120$ mmHg OR Diastolic BP $> 80$ mmHg OR HSS $< 50$**.

---

## 13. Offline / Synchronization Architecture

```text
                  Mobile Client (Network Disconnect)
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
  Telemetry Domain Actions                       Generic API Requests
  (Meals, Exercises, Sleep, Vitals)               (SyncService / OfflineSync)
          │                                               │
          ▼                                               ▼
  Local AsyncStorage Queues                      Local AsyncStorage Queue
  • @offline_meal_queue                          • @offline_request_queue
  • @offline_exercise_queue                               │
  • @offline_sleep_queue                                  │
  • @offline_health_queue                                 │
          │                                               │
          └───────────────────────┬───────────────────────┘
                                  │
                    Network Connectivity Restored
                    (NetInfo / AppState Reconnect)
                                  │
                                  ▼
                   Token & Auth Pre-Flight Check
                     (AsyncStorage 'access_token')
                                  │
                   ┌──────────────┴──────────────┐
                   │ Token Valid?                │
                   ▼                             ▼
                 [ YES ]                       [ NO ]
                   │                             │
                   ▼                             ▼
        Sequential Queue Dispatch         Halt Sync Pass
                   │                      (Prevent 401 Loops)
         ┌─────────┴─────────┐
         ▼                   ▼
    [ HTTP 2xx ]        [ HTTP 401 ] ──► Circuit Breaker: Halt Pass
    Dequeue Item        [ HTTP 4xx ] ──► Quarantine Invalid Item
                        [ HTTP 5xx / NetErr ] ──► Retain for Retry
```

### Mobile Offline Systems
1. **Domain-Specific Telemetry Queues** (`HeartLink-mobile/services/SyncService.ts`):
   - Dedicated queues for `@offline_meal_queue`, `@offline_exercise_queue`, `@offline_sleep_queue`, and `@offline_health_queue`.
   - Unified synchronization executed via `syncOfflineAll(baseUrl)`.
2. **Generic Request Queue** (`HeartLink-mobile/utils/OfflineSyncService.ts`):
   - Stores queued HTTP requests (`QueuedRequest`) in `@offline_request_queue` with URL, method, payload, and headers.
3. **Resilience & Circuit-Breaking Mechanics**:
   - **Pre-Flight Authentication**: Queue processing checks for an `access_token` before attempting network calls.
   - **401 Circuit Breaker**: If any queued request returns HTTP 401 Unauthorized, the synchronization pass immediately halts, preserving remaining items and preventing token hammering.
   - **Client Error Quarantining**: 4xx errors (400, 422, 403) representing malformed payloads are dropped from the queue to prevent permanent blocking.
   - **Profile Caching**: `UserContext.tsx` maintains `@user_profile_cache` in AsyncStorage to allow cold offline app startups without UI blocking.

---

## 14. Auth & Security Model

1. **Cryptographic Token Verification**:
   - Token signature checking is strictly enforced using `jwt.decode` with the HMAC-SHA256 algorithm. Unsigned tokens or tokens with mismatched signatures are rejected.
2. **Password Storage**:
   - User passwords in the active system are stored using SHA-256 password hashing.
3. **Database Row Level Security (RLS)**:
   - All 26 application tables have Row Level Security enabled (`ENABLE ROW LEVEL SECURITY`).
   - Policies enforce that patients can only access rows matching `auth.uid() = user_id`, while administrative roles (`admin`, `super_admin`, `medical_expert`) are granted access according to their role definitions.
4. **CORS Hardening**:
   - Wildcard CORS (`*`) is disabled.
   - Allowed origins are loaded from `CORS_ALLOWED_ORIGINS` environment variables, defaulting to local development origins (`http://localhost:5173`, `http://localhost:8081`, `http://localhost:8000`, `http://localhost:3000`).
5. **Database Error Sanitization**:
   - Repository base classes intercept internal PostgreSQL and PostgREST exceptions, mapping them to standard HTTP status codes (409 Conflict, 422 Unprocessable Entity, 403 Forbidden, 503 Unavailable) without leaking SQL table names, constraint details, or database internals.

### Current Security Constraints
- **In-Memory Token Blacklist**: The revoked token blacklist (`token_blacklist`) is maintained in FastAPI server process memory; in a multi-instance production deployment, a distributed cache (such as Redis) is required for cross-instance token invalidation.
- **Development OTP Bypass**: Development environment accounts utilize local OTP verification without external SMS gateway dispatch.

---

## 15. Storage Model

### Provisioned Supabase Storage Buckets

| Bucket Name | Access Policy | File Size Limit | Allowed MIME Types | Intended Assets | Authorization Policy |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **`avatars`** | Public Read | 2,097,152 bytes (2 MB) | `image/jpeg`, `image/png`, `image/webp` | User profile avatar photos | Public read; authenticated user write to own `{user_id}/` folder |
| **`recipes`** | Public Read | 5,242,880 bytes (5 MB) | `image/jpeg`, `image/png`, `image/webp` | Recipe preview & dish photos | Public read; staff (`admin`, `super_admin`) write |
| **`exercises`**| Public Read | 20,971,520 bytes (20 MB)| `image/jpeg`, `image/png`, `image/webp`, `video/mp4` | Exercise guides, images & video clips | Public read; staff (`admin`, `super_admin`) write |

---

## 16. Data Lifecycle

| Data Domain | Creation Origin | Primary Consumers | Update Policy | Delete & Cascade Policy |
| :--- | :--- | :--- | :--- | :--- |
| **User Identity & Profile** | Registration OTP (`/auth/verify-code`)| Mobile User, Web Admin | Owner can update biometrics; SuperAdmin can update role/status | Deleting profile cascades all telemetry, baselines, reminders, and notifications |
| **Baseline Questionnaire** | Mobile Onboarding (`/baseline/complete`)| Mobile User, Medical Expert | Replaced upon re-taking baseline survey | Cascades on profile deletion |
| **Health Telemetry (Vitals/Meals/Sleep/Exercise)**| Mobile Daily Logging | Mobile User, Web Admin Timeline, Medical Expert Case Review | Append-only; soft-delete on sleep; individual log deletion by owner | Cascades on profile deletion |
| **HSS Stability History** | ML Scoring Engine / Expert Evaluation | Mobile Dashboard & Analytics, Web Admin KPI | Append-only chronological stream | Cascades on profile deletion |
| **Clinical Alerts** | Automated trigger on vitals threshold breach | Web Admin, Medical Expert | Status updated to `'Resolved'` or `'Dismissed'` | Cascades on profile deletion |
| **System Broadcasts** | Web Admin Announcement publish | Mobile Patient Inbox, Public Broadcasts list | Admin can edit content | Deleted broadcasts cascade linked patient inbox copies |
| **Feedback Tickets** | Mobile User Support / Bug Report | Web Admin Support Desk | Status updated (`'Open'` $\rightarrow$ `'Resolved'`), Admin notes appended | Retained on user deletion (`user_id SET NULL`) |
| **Admin Activity Audit Logs**| Automated on staff actions | Web Admin Audit Log viewer | **Immutable** (`deny_activity_log_modification` trigger denies UPDATE/DELETE) | Retained on admin deletion (`admin_user_id SET NULL`)|
| **Expert Evaluations** | Medical Expert Case Review | Medical Expert Calibration, ML Dataset generation | Medical expert can re-evaluate case; archive evaluation | Retained on user/expert deletion (`SET NULL`) |

---

## 17. Transactions & Idempotency

1. **Baseline Completion Pipeline**:
   - Executes as a coordinated workflow: validates pre-conditions $\rightarrow$ executes ML inference $\rightarrow$ upserts `baseline_onboarding` $\rightarrow$ marks `profiles.onboarding_status='complete'` $\rightarrow$ inserts initial `hss_history` record.
2. **Account Deletion Pipeline**:
   - Executes with foreign key cascade guarantees: deleting from `public.profiles` cascades all linked records in 11 child tables (`baseline_onboarding`, `user_thresholds`, `user_reminders`, `care_team_contacts`, `daily_health_logs`, `meal_logs`, `exercise_logs`, `sleep_logs`, `hss_history`, `clinical_alerts`, `patient_notifications`).
3. **Bookmark Idempotency**:
   - `saved_recipes` and `saved_exercises` enforce composite unique constraints `(user_id, recipe_id)` and `(user_id, routine_id)` with `ON CONFLICT DO NOTHING` idempotency.
4. **Admin Notification Read State**:
   - `admin_notification_reads` uses composite primary key `(notification_id, admin_user_id)` with `ON CONFLICT DO NOTHING` idempotency for marking notifications as read.

---

## 18. Environment & Deployment Configuration

### 18.1 Backend Server Configuration (`backend/.env`)
```ini
# ==============================================================================
# HeartLink Backend Environment Configuration
# ==============================================================================

# Database Persistence Mode: 'mock' (default offline/JSON) or 'supabase' (PostgreSQL)
DATABASE_MODE=supabase

# ------------------------------------------------------------------------------
# SUPABASE CONFIGURATION (SERVER-SIDE ONLY)
# CAUTION: Never expose SUPABASE_SERVICE_ROLE_KEY to mobile or web clients.
# ------------------------------------------------------------------------------
SUPABASE_URL=https://ftzqfojapetmahxfecbm.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key-configured-in-env>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key-configured-in-env>

# ------------------------------------------------------------------------------
# JWT & AUTHENTICATION (SERVER-SIDE ONLY)
# ------------------------------------------------------------------------------
SECRET_KEY=<server-jwt-signing-secret-configured-in-env>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24

# ------------------------------------------------------------------------------
# INVITED TESTER ALLOWLIST (TESTING PHASE ONLY)
# ------------------------------------------------------------------------------
# INVITED_TESTER_NUMBERS=+639171234567,+639281234567

# Production Web Admin Domain & Local Development Origins
CORS_ALLOWED_ORIGINS=https://heartlink-admin.vercel.app,https://heartlink-web.onrender.com,http://localhost:5173,http://localhost:8081,http://localhost:8000,http://127.0.0.1:5173,http://127.0.0.1:8000
```

### 18.2 Mobile Client Configuration (`HeartLink-mobile/.env`)
```ini
# Public API Gateway (Live Render Deployment)
EXPO_PUBLIC_API_URL=https://heartlink-app-b8ba.onrender.com
```

### 18.3 Web Client Configuration (`HeartLink-web/.env`)
```ini
# Public API Gateway (Live Render Deployment)
VITE_API_URL=https://heartlink-app-b8ba.onrender.com
```

### 18.4 Cloud Deployment Specifications (Render)
- **Primary API URL**: `https://heartlink-app-b8ba.onrender.com`
- **Health Check Endpoints**: `https://heartlink-app-b8ba.onrender.com/health` and `/api/health`
- **OpenAPI Interactive Documentation**: `https://heartlink-app-b8ba.onrender.com/docs`
- **Runtime Environment**: Python 3.11.9 (declared in `backend/.python-version`)
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Region**: Singapore (Southeast Asia)
- **Auto-Deploy**: Enabled on Git push to `main`

---

## 19. Current System Limitations

1. **In-Memory Rate Limiting and Token Blacklist**: The current implementation of token blacklisting and login rate-limiting resides in application memory; scaling horizontally across multiple web nodes requires a shared Redis store.
2. **Development SMS Simulation**: Registration OTP codes in the development environment are handled via internal verification services rather than an external SMS provider.
3. **Offline ML Retraining**: Model retraining is designated as an offline batch workflow; runtime API `/api/expert/retrain` intentionally returns HTTP 501.

---

## 20. Specification Integrity Rules

1. `SPEC.md` describes the current implementation.
2. Code and live database migrations are authoritative.
3. This file is documentation, not a source of runtime configuration.
4. Changes to API contracts or database schema require updating `SPEC.md`.
5. No secret values belong in this file.
6. Deprecated architecture must not be documented as current.
7. If a behavior cannot be verified from the current repository, it must be marked as `UNKNOWN / NOT VERIFIED`.

---

## 21. Critical Accuracy Requirements

- **Database Verification**: All 26 documented tables, columns, check constraints, foreign keys, triggers, and RLS policies correspond exactly to migrations `001_extensions.sql` through `012_add_duration_seconds_to_exercise_logs.sql`.
- **API Verification**: Every listed endpoint corresponds to active routers registered in `backend/app/main.py`.
- **Frontend Verification**: All documented client flows map directly to active TSX / JSX files in `HeartLink-mobile` and `HeartLink-web`.
- **Role Verification**: All permissions match backend dependency checks (`get_current_user`, `get_current_admin_user`, `get_current_super_admin`, `_require_medical_expert`).
- **No Secret Leakage**: Zero raw secrets, private keys, or passwords appear in this document.

---

## 22. System Readiness Snapshot

| Domain | Current State | Verified From |
| :--- | :---: | :--- |
| **Authentication** | `VERIFIED` | `security.py`, `auth_service.py`, `test_supabase_auth_security.py` |
| **Authorization & RBAC** | `VERIFIED` | `security.py`, `010_functions_triggers_rls.sql` |
| **PostgreSQL Schema (26 Tables)** | `VERIFIED` | `backend/supabase/migrations/*.sql`, `validate_live_supabase_schema.py` |
| **Repository Layer** | `VERIFIED` | `backend/app/db/repositories/*.py`, `test_supabase_repository_contract.py` |
| **Cloud Hosting (Render Gateway)** | `DEPLOYED & ACTIVE` | `https://heartlink-app-b8ba.onrender.com`, `render.yaml`, `RENDER_DEPLOYMENT.md` |
| **Mobile Client (Expo)** | `VERIFIED & CONNECTED`| `HeartLink-mobile/.env`, TypeScript check (`tsc --noEmit`) |
| **Web Admin & Expert Portal** | `VERIFIED & CONNECTED`| `HeartLink-web/.env`, Vite production build |
| **HSS / Clinical Scoring Engine** | `VERIFIED` | `hss_service.py`, `feature_transform.py`, `heartlink_model.pkl` |
| **Notifications & Broadcasts** | `VERIFIED` | `notifications_api.py`, `admin_notifications_api.py`, `006_notifications.sql` |
| **Offline Synchronization** | `VERIFIED` | `SyncService.ts`, `OfflineSyncService.ts`, `UserContext.tsx` |
| **Storage Subsystem** | `VERIFIED` | `storage_service.py`, `010_functions_triggers_rls.sql`, `test_supabase_storage_security.py` |
| **Environment Configuration** | `VERIFIED` | `backend/.env.example`, `HeartLink-mobile/.env.example`, `HeartLink-web/.env.example` |
