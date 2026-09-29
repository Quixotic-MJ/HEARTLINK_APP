### Other - `profiles`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `profiles` | `id` | `UUID` | PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE | |
|  | `legacy_id` | `TEXT` | UNIQUE | |
|  | `phone` | `TEXT` |  | |
|  | `email` | `TEXT` |  | |
|  | `first_name` | `TEXT` | DEFAULT '' | |
|  | `last_name` | `TEXT` | DEFAULT '' | |
|  | `date_of_birth` | `DATE` |  | |
|  | `sex` | `TEXT` | CHECK (sex IS NULL OR sex IN ('male', 'female')) | |
|  | `height_cm` | `NUMERIC` | CHECK (height_cm IS NULL OR (height_cm >= 50.0 AND height_cm <= 300.0)) | |
|  | `weight_kg` | `NUMERIC` | CHECK (weight_kg IS NULL OR (weight_kg >= 20.0 AND weight_kg <= 400.0)) | |
|  | `avatar_url` | `TEXT` |  | |
|  | `health_goals` | `TEXT[]` | DEFAULT '{}' | |
|  | `onboarding_status` | `TEXT` | DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'complete')) | |
|  | `account_status` | `TEXT` | DEFAULT 'active' CHECK (account_status IN ('active', 'disabled', 'archived')) | |
|  | `role` | `TEXT` | DEFAULT 'patient' CHECK (role IN ('patient', 'medical_expert', 'admin', 'super_admin')) | |
|  | `created_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |
|  | `updated_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.2 Patient Data & Settings - `baseline_onboarding`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `baseline_onboarding` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `vigorous_activity` | `BOOLEAN` | NOT NULL DEFAULT false | |
|  | `vigorous_days` | `INT` | CHECK (vigorous_days IS NULL OR (vigorous_days >= 1 AND vigorous_days <= 7)) | |
|  | `vigorous_minutes` | `INT` | CHECK (vigorous_minutes IS NULL OR (vigorous_minutes >= 1 AND vigorous_minutes <= 720)) | |
|  | `moderate_activity` | `BOOLEAN` | NOT NULL DEFAULT false | |
|  | `moderate_days` | `INT` | CHECK (moderate_days IS NULL OR (moderate_days >= 1 AND moderate_days <= 7)) | |
|  | `moderate_minutes` | `INT` | CHECK (moderate_minutes IS NULL OR (moderate_minutes >= 1 AND moderate_minutes <= 720)) | |
|  | `walk_bike_transport` | `BOOLEAN` | NOT NULL DEFAULT false | |
|  | `walk_bike_days` | `INT` | CHECK (walk_bike_days IS NULL OR (walk_bike_days >= 1 AND walk_bike_days <= 7)) | |
|  | `walk_bike_minutes` | `INT` | CHECK (walk_bike_minutes IS NULL OR (walk_bike_minutes >= 1 AND walk_bike_minutes <= 720)) | |
|  | `sedentary_hours` | `TEXT` | NOT NULL CHECK (sedentary_hours IN ('<2h', '2-4h', '4-6h', '6-8h', '8+h')) | |
|  | `sleep_hours` | `NUMERIC` | NOT NULL CHECK (sleep_hours >= 1.0 AND sleep_hours <= 24.0) | |
|  | `ever_smoked` | `BOOLEAN` | NOT NULL DEFAULT false | |
|  | `smoke_now` | `TEXT` | CHECK (smoke_now IS NULL OR smoke_now IN ('Every day', 'Some days', 'Not at all')) | |
|  | `ever_drank` | `BOOLEAN` | NOT NULL DEFAULT false | |
|  | `drink_frequency` | `TEXT` | CHECK (drink_frequency IS NULL OR drink_frequency IN ('Never', 'Monthly or less', '2-4x/month', '2-3x/week', '4+/week')) | |
|  | `drinks_per_occasion` | `TEXT` | CHECK (drinks_per_occasion IS NULL OR drinks_per_occasion IN ('1-2', '3-4', '5+')) | |
|  | `binge_drinking_freq` | `TEXT` | CHECK (binge_drinking_freq IS NULL OR binge_drinking_freq IN ('Never', 'Monthly or less', '2-4x/month', '2-3x/week', '4+/week')) | |
|  | `diet_level` | `TEXT` | NOT NULL CHECK (diet_level IN ('light', 'average', 'heavy', 'very_heavy')) | |
|  | `fried_food_freq` | `TEXT` | NOT NULL CHECK (fried_food_freq IN ('rarely', 'sometimes', 'often', 'daily')) | |
|  | `salty_food_freq` | `TEXT` | NOT NULL CHECK (salty_food_freq IN ('rarely', 'sometimes', 'often', 'daily')) | |
|  | `fruit_veg_servings` | `TEXT` | NOT NULL CHECK (fruit_veg_servings IN ('0-1', '2-3', '4-5', '6+')) | |
|  | `allergies` | `TEXT[]` | DEFAULT '{}' | |
|  | `dietary_practice` | `TEXT` | DEFAULT 'None' | |
|  | `created_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |
|  | `updated_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.2 Patient Data & Settings - `user_thresholds`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `user_thresholds` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `sodium_limit_mg` | `INT` | NOT NULL CHECK (sodium_limit_mg >= 500 AND sodium_limit_mg <= 5000) | |
|  | `fluid_limit_ml` | `INT` | DEFAULT 2000 CHECK (fluid_limit_ml IS NULL OR (fluid_limit_ml >= 500 AND fluid_limit_ml <= 5000)) | |
|  | `active_minutes_goal` | `INT` | NOT NULL CHECK (active_minutes_goal >= 0 AND active_minutes_goal <= 300) | |
|  | `systolic_threshold` | `INT` | NOT NULL CHECK (systolic_threshold >= 80 AND systolic_threshold <= 200) | |
|  | `diastolic_threshold` | `INT` | NOT NULL CHECK (diastolic_threshold >= 40 AND diastolic_threshold <= 130) | |
|  | `updated_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.2 Patient Data & Settings - `user_reminders`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `user_reminders` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `morning` | `JSONB` | NOT NULL DEFAULT '{"enabled": true, "time": "08:00"}'::jsonb | |
|  | `evening` | `JSONB` | NOT NULL DEFAULT '{"enabled": false, "time": "20:00"}'::jsonb | |
|  | `activity` | `JSONB` | NOT NULL DEFAULT '{"enabled": false, "time": "17:00"}'::jsonb | |
|  | `updated_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.2 Patient Data & Settings - `care_team_contacts`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `care_team_contacts` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `name` | `TEXT` | NOT NULL | |
|  | `role_title` | `TEXT` | NOT NULL | |
|  | `contact_type` | `TEXT` | NOT NULL DEFAULT 'doctor' CHECK (contact_type IN ('doctor', 'emergency')) | |
|  | `phone` | `TEXT` | NOT NULL | |
|  | `created_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.3 Global Content & Bookmarks - `recipes`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `recipes` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `legacy_id` | `TEXT` | UNIQUE | |
|  | `name` | `TEXT` | NOT NULL | |
|  | `subtitle` | `TEXT` |  | |
|  | `category` | `TEXT` | NOT NULL CHECK (category IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')) | |
|  | `hss_tier` | `TEXT` | NOT NULL CHECK (hss_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')) | |
|  | `sodium_mg` | `NUMERIC` | NOT NULL CHECK (sodium_mg >= 0) | |
|  | `calories` | `NUMERIC` | NOT NULL CHECK (calories >= 0) | |
|  | `saturated_fat_g` | `NUMERIC` | NOT NULL DEFAULT 0 CHECK (saturated_fat_g >= 0) | |
|  | `cholesterol_mg` | `NUMERIC` | NOT NULL DEFAULT 0 CHECK (cholesterol_mg >= 0) | |
|  | `fiber_g` | `NUMERIC` | NOT NULL DEFAULT 0 CHECK (fiber_g >= 0) | |
|  | `prep_time_minutes` | `INT` | NOT NULL CHECK (prep_time_minutes >= 0) | |
|  | `servings` | `INT` | NOT NULL CHECK (servings >= 1) | |
|  | `difficulty` | `TEXT` | NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) | |
|  | `heart_benefit` | `TEXT` |  | |
|  | `tags` | `TEXT[]` | DEFAULT '{}' | |
|  | `ingredients` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | |
|  | `steps` | `TEXT[]` | DEFAULT '{}' | |
|  | `image_url` | `TEXT` | DEFAULT '' | |
|  | `status` | `TEXT` | NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')) | |
|  | `expert_validated` | `BOOLEAN` | NOT NULL DEFAULT true | |
|  | `created_by` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `created_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |
|  | `updated_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.3 Global Content & Bookmarks - `exercise_routines`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `exercise_routines` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `legacy_id` | `TEXT` | UNIQUE | |
|  | `name` | `TEXT` | NOT NULL | |
|  | `description` | `TEXT` |  | |
|  | `duration_minutes` | `INT` | NOT NULL CHECK (duration_minutes >= 1) | |
|  | `hss_tier` | `TEXT` | NOT NULL CHECK (hss_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')) | |
|  | `type` | `TEXT` | NOT NULL | |
|  | `intensity` | `TEXT` | NOT NULL CHECK (intensity IN ('None', 'Low', 'Moderate', 'High')) | |
|  | `goal` | `TEXT` |  | |
|  | `steps` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | |
|  | `media_url` | `TEXT` | DEFAULT '' | |
|  | `video_url` | `TEXT` | DEFAULT '' | |
|  | `guide_images` | `TEXT[]` | DEFAULT '{}' | |
|  | `status` | `TEXT` | NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')) | |
|  | `expert_validated` | `BOOLEAN` | NOT NULL DEFAULT true | |
|  | `created_by` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `created_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |
|  | `updated_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.3 Global Content & Bookmarks - `clinics`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `clinics` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `legacy_id` | `TEXT` | UNIQUE | |
|  | `name` | `TEXT` | NOT NULL | |
|  | `doctor` | `TEXT` | NOT NULL | |
|  | `latitude` | `NUMERIC` | NOT NULL | |
|  | `longitude` | `NUMERIC` | NOT NULL | |
|  | `phone` | `TEXT` | NOT NULL | |
|  | `specialty` | `TEXT` | NOT NULL | |
|  | `created_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.3 Global Content & Bookmarks - `saved_recipes`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `saved_recipes` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `recipe_id` | `UUID` | NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE | |
|  | `saved_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.3 Global Content & Bookmarks - `saved_exercises`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `saved_exercises` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `routine_id` | `UUID` | NOT NULL REFERENCES public.exercise_routines(id) ON DELETE CASCADE | |
|  | `saved_at` | `TIMESTAMPTZ` | DEFAULT timezone('utc'::text, now()) NOT NULL | |

### 2.4 Health Tracking & Logs - `daily_health_logs`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `daily_health_logs` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `systolic_bp` | `INT` | NOT NULL CHECK (systolic_bp >= 50 AND systolic_bp <= 300) | |
|  | `diastolic_bp` | `INT` | NOT NULL CHECK (diastolic_bp >= 30 AND diastolic_bp <= 200) | |
|  | `heart_rate_bpm` | `INT` | NOT NULL CHECK (heart_rate_bpm >= 30 AND heart_rate_bpm <= 250) | |
|  | `weight_kg` | `NUMERIC` | CHECK (weight_kg IS NULL OR (weight_kg >= 20.0 AND weight_kg <= 400.0)) | |
|  | `blood_sugar` | `NUMERIC` | CHECK (blood_sugar IS NULL OR (blood_sugar >= 20.0 AND blood_sugar <= 1000.0)) | |
|  | `medication_taken` | `BOOLEAN` | NOT NULL DEFAULT false | |
|  | `symptoms` | `TEXT[]` | DEFAULT '{}' | |
|  | `severity_map` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `context` | `TEXT` | CHECK (context IS NULL OR context IN ('resting', 'after_eating', 'after_exercise', 'morning', 'evening', 'other')) | |
|  | `notes` | `TEXT` |  | |
|  | `triggered_by_exercise_id` | `UUID` |  | |
|  | `logged_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.4 Health Tracking & Logs - `meal_logs`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `meal_logs` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `recipe_id` | `UUID` | REFERENCES public.recipes(id) ON DELETE SET NULL | |
|  | `meal_name` | `TEXT` | NOT NULL | |
|  | `barcode` | `TEXT` |  | |
|  | `portion` | `TEXT` | DEFAULT '1 serving' | |
|  | `calories` | `NUMERIC` | NOT NULL CHECK (calories >= 0) | |
|  | `sodium_mg` | `NUMERIC` | NOT NULL CHECK (sodium_mg >= 0) | |
|  | `saturated_fat_g` | `NUMERIC` | NOT NULL DEFAULT 0 CHECK (saturated_fat_g >= 0) | |
|  | `fiber_g` | `NUMERIC` | NOT NULL DEFAULT 0 CHECK (fiber_g >= 0) | |
|  | `image_url` | `TEXT` | DEFAULT '' | |
|  | `logged_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.4 Health Tracking & Logs - `exercise_logs`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `exercise_logs` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `routine_id` | `UUID` | REFERENCES public.exercise_routines(id) ON DELETE SET NULL | |
|  | `routine_name` | `TEXT` | NOT NULL | |
|  | `duration_minutes` | `INT` | NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 1440) | |
|  | `status` | `TEXT` | NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'skipped', 'partial', 'incomplete_due_to_symptoms', 'abandoned')) | |
|  | `logged_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.4 Health Tracking & Logs - `sleep_logs`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `sleep_logs` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `duration_hours` | `NUMERIC` | NOT NULL CHECK (duration_hours >= 0.5 AND duration_hours <= 24.0) | |
|  | `quality` | `TEXT` | NOT NULL CHECK (quality IN ('Poor', 'Fair', 'Good', 'Excellent')) | |
|  | `is_deleted` | `BOOLEAN` | NOT NULL DEFAULT false | |
|  | `logged_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.4 Health Tracking & Logs - `hss_history`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `hss_history` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `score` | `INT` | NOT NULL CHECK (score >= 1 AND score <= 100) | |
|  | `tier` | `TEXT` | NOT NULL CHECK (tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')) | |
|  | `risk_probability` | `NUMERIC` | CHECK (risk_probability IS NULL OR (risk_probability >= 0.0 AND risk_probability <= 1.0)) | |
|  | `source` | `TEXT` | NOT NULL DEFAULT 'telemetry' CHECK (source IN ('baseline', 'telemetry', 'expert_override')) | |
|  | `model_version` | `TEXT` | DEFAULT 'v1.0.0' | |
|  | `model_hash` | `TEXT` |  | |
|  | `contributing_factors` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `computed_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.4 Health Tracking & Logs - `clinical_alerts`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `clinical_alerts` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `severity` | `TEXT` | NOT NULL CHECK (severity IN ('Info', 'Warning', 'Critical')) | |
|  | `alert_type` | `TEXT` | NOT NULL | |
|  | `title` | `TEXT` | NOT NULL | |
|  | `message` | `TEXT` | NOT NULL | |
|  | `status` | `TEXT` | NOT NULL DEFAULT 'Under Review' CHECK (status IN ('Under Review', 'Resolved', 'Dismissed')) | |
|  | `trigger_context` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `system_action` | `TEXT` |  | |
|  | `flagged_hss` | `INT` |  | |
|  | `patient_snapshot` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `metadata` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |
|  | `resolved_at` | `TIMESTAMPTZ` |  | |

### 2.5 System & User Notifications - `system_broadcasts`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `system_broadcasts` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `legacy_id` | `TEXT` | UNIQUE | |
|  | `title` | `TEXT` | NOT NULL | |
|  | `message` | `TEXT` | NOT NULL | |
|  | `type` | `TEXT` | NOT NULL CHECK (type IN ('Maintenance', 'App Update', 'Safety Reminder', 'General', 'Health Tip', 'Feature Update', 'General Announcement')) | |
|  | `target_audience` | `TEXT` | NOT NULL DEFAULT 'All Registered Accounts' | |
|  | `publisher` | `TEXT` |  | |
|  | `publisher_id` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `display_publisher` | `TEXT` | NOT NULL | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.5 System & User Notifications - `patient_notifications`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `patient_notifications` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `broadcast_id` | `UUID` | REFERENCES public.system_broadcasts(id) ON DELETE CASCADE | |
|  | `type` | `TEXT` | NOT NULL CHECK (type IN ('alert', 'insight', 'achievement', 'reminder', 'announcement', 'system')) | |
|  | `scope` | `TEXT` | NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'broadcast')) | |
|  | `broadcast_type` | `TEXT` |  | |
|  | `publisher_id` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `title` | `TEXT` | NOT NULL | |
|  | `message` | `TEXT` | NOT NULL | |
|  | `read` | `BOOLEAN` | NOT NULL DEFAULT false | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.6 Admin Logs & Feedback - `admin_notifications`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `admin_notifications` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `legacy_id` | `TEXT` | UNIQUE | |
|  | `type` | `TEXT` | NOT NULL CHECK (type IN ('feedback', 'staff', 'security', 'system')) | |
|  | `title` | `TEXT` | NOT NULL | |
|  | `message` | `TEXT` | NOT NULL | |
|  | `severity` | `TEXT` | NOT NULL CHECK (severity IN ('info', 'warning')) | |
|  | `recipient_roles` | `TEXT[]` | NOT NULL DEFAULT '{admin,super_admin}' | |
|  | `route` | `TEXT` | NOT NULL CHECK (route IN ('/feedbacks', '/users', '/settings')) | |
|  | `target_id` | `TEXT` |  | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.6 Admin Logs & Feedback - `admin_notification_reads`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `admin_notification_reads` | `notification_id` | `UUID` | NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE | |
|  | `admin_user_id` | `UUID` | NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE | |
|  | `read_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.6 Admin Logs & Feedback - `admin_activity_logs`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `admin_activity_logs` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `admin_user_id` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `admin_name` | `TEXT` | NOT NULL | |
|  | `action` | `TEXT` | NOT NULL | |
|  | `target_type` | `TEXT` | NOT NULL | |
|  | `target_id` | `TEXT` |  | |
|  | `target_name` | `TEXT` |  | |
|  | `details` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.6 Admin Logs & Feedback - `feedback_tickets`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `feedback_tickets` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `ticket_code` | `TEXT` | UNIQUE NOT NULL | |
|  | `user_id` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `user_name` | `TEXT` | NOT NULL | |
|  | `user_email` | `TEXT` | NOT NULL | |
|  | `category` | `TEXT` | NOT NULL CHECK (category IN ('Bug Report', 'UI/UX Suggestion', 'Account Issue', 'Question', 'Other')) | |
|  | `preview` | `TEXT` | NOT NULL | |
|  | `full_message` | `TEXT` | NOT NULL | |
|  | `status` | `TEXT` | NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')) | |
|  | `device_meta` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `admin_notes` | `TEXT` | DEFAULT '' | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |
|  | `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.7 ML Calibration & Review - `calibration_datasets`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `calibration_datasets` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `dataset_id` | `TEXT` | UNIQUE NOT NULL | |
|  | `name` | `TEXT` | NOT NULL | |
|  | `description` | `TEXT` |  | |
|  | `record_count` | `INT` | NOT NULL DEFAULT 0 CHECK (record_count >= 0) | |
|  | `excluded_record_count` | `INT` | NOT NULL DEFAULT 0 CHECK (excluded_record_count >= 0) | |
|  | `model_hashes_represented` | `TEXT[]` | DEFAULT '{}' | |
|  | `feature_pipeline_versions_represented` | `TEXT[]` | DEFAULT '{}' | |
|  | `source_evaluation_ids` | `TEXT[]` | DEFAULT '{}' | |
|  | `rows` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb | |
|  | `created_by` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.7 ML Calibration & Review - `candidate_models`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `candidate_models` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `model_id` | `TEXT` | UNIQUE NOT NULL | |
|  | `artifact_filename` | `TEXT` | NOT NULL | |
|  | `model_hash` | `TEXT` | NOT NULL | |
|  | `dataset_id` | `TEXT` |  | |
|  | `feature_pipeline_identifier` | `TEXT` |  | |
|  | `validation_metrics` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | |
|  | `status` | `TEXT` | NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved', 'rejected', 'deployed')) | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.7 ML Calibration & Review - `calibration_records`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `calibration_records` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `dataset_id` | `UUID` | REFERENCES public.calibration_datasets(id) ON DELETE SET NULL | |
|  | `model_version` | `TEXT` | NOT NULL | |
|  | `pre_brier_score` | `NUMERIC` | NOT NULL | |
|  | `post_brier_score` | `NUMERIC` | NOT NULL | |
|  | `pre_ece` | `NUMERIC` | NOT NULL | |
|  | `post_ece` | `NUMERIC` | NOT NULL | |
|  | `calibration_method` | `TEXT` | NOT NULL CHECK (calibration_method IN ('platt_scaling', 'isotonic_regression', 'temperature_scaling')) | |
|  | `calibrated_by` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `calibrated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |

### 2.7 ML Calibration & Review - `expert_evaluations`

| Table Name | Column | Data Type | Constraints | Description |
|---|---|---|---|---|
| `expert_evaluations` | `id` | `UUID` | PRIMARY KEY DEFAULT gen_random_uuid() | |
|  | `legacy_id` | `TEXT` | UNIQUE | |
|  | `case_id` | `TEXT` | NOT NULL | |
|  | `user_id` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `expert_id` | `UUID` | REFERENCES public.profiles(id) ON DELETE SET NULL | |
|  | `reviewer_name` | `TEXT` | NOT NULL | |
|  | `model_score` | `INT` | NOT NULL | |
|  | `model_tier` | `TEXT` | NOT NULL | |
|  | `expert_score` | `INT` | NOT NULL CHECK (expert_score >= 1 AND expert_score <= 100) | |
|  | `expert_tier` | `TEXT` | NOT NULL CHECK (expert_tier IN ('Stable', 'Moderate', 'Elevated Risk', 'Critical')) | |
|  | `score_difference` | `INT` | NOT NULL | |
|  | `tier_match` | `BOOLEAN` | NOT NULL | |
|  | `notes` | `TEXT` | NOT NULL | |
|  | `recommendation_feedback` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `exercise_feedback` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `recipe_feedback` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `adjustment_reasons` | `TEXT[]` | DEFAULT '{}' | |
|  | `reviewer_confidence` | `NUMERIC` | CHECK (reviewer_confidence IS NULL OR (reviewer_confidence >= 0.0 AND reviewer_confidence <= 1.0)) | |
|  | `input_snapshot` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | |
|  | `review_context` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `model_metadata` | `JSONB` | DEFAULT '{}'::jsonb | |
|  | `status` | `TEXT` | NOT NULL DEFAULT 'Logged' CHECK (status IN ('Logged', 'Archived', 'Pending', 'completed')) | |
|  | `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT timezone('utc'::text, now()) | |