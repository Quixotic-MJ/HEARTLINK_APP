-- backend/supabase/migrations/040_clinic_directory.sql
-- HL-088: the Nearby Clinics list becomes a checked Cebu City directory. The old hand-made list had invented doctors
-- and fake phone numbers on real hospitals, places that don't fit heart care, and "24/7 Emergency" guessed from names.
-- Each place now says what it is (kind) and whether it has an emergency room (has_er: true, false, or null = not
-- checked yet). The first rows come from OpenStreetMap (source 'osm', 2026-10-27): 10 hospitals tagged as having an
-- emergency room, 2 other hospitals, 7 barangay health centres and 17 general clinics. Their phone numbers are
-- stored unchecked (phone_verified = false), so the app shows no Call button until the team checks them (OT-06).
-- Safe to re-run: rows are matched by osm_id, and a number or ER answer the team checked is never overwritten.

ALTER TABLE public.clinics ALTER COLUMN doctor DROP NOT NULL;
ALTER TABLE public.clinics ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.clinics ALTER COLUMN specialty DROP NOT NULL;

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS has_er boolean;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS osm_id text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS checked_at timestamptz;

ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_kind_check;
ALTER TABLE public.clinics ADD CONSTRAINT clinics_kind_check
    CHECK (kind IS NULL OR kind IN ('er_hospital', 'hospital', 'clinic', 'health_center'));
ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_source_check;
ALTER TABLE public.clinics ADD CONSTRAINT clinics_source_check CHECK (source IS NULL OR source IN ('osm', 'team'));
ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_osm_id_key;
ALTER TABLE public.clinics ADD CONSTRAINT clinics_osm_id_key UNIQUE (osm_id);

COMMENT ON COLUMN public.clinics.has_er IS 'Has an emergency room: true / false, or null when not checked yet';
COMMENT ON COLUMN public.clinics.phone_verified IS 'The team checked this number; the app only offers Call when true';

-- The old hand-made list (no source): invented doctors, fake numbers, unsuitable places
DELETE FROM public.clinics WHERE source IS NULL AND osm_id IS NULL;

INSERT INTO public.clinics (osm_id, name, kind, has_er, address, latitude, longitude, phone, phone_verified, source)
SELECT v.osm_id, v.name, v.kind, v.has_er, v.address, v.latitude, v.longitude, v.phone, false, 'osm'
FROM (VALUES
    ('way/1361864477', 'ACE Medical Center - Cebu', 'er_hospital', true, '982 Natalio Bacalso Avenue, Basak Pardo, Cebu City', 10.28712, 123.863193, '+63 323833454'),
    ('way/290897615', 'Adventist Hospital - Cebu', 'er_hospital', true, '400 Tres de Abril Street, Cebu City', 10.296052, 123.887667, '+63 32 261 2113'),
    ('relation/12661604', 'Cebu Doctors'' University Hospital', 'er_hospital', true, 'Osmeña Boulevard, Cebu City', 10.314048, 123.892224, '+63 32 255 5555'),
    ('way/611916620', 'Cebu Velez General Hospital', 'er_hospital', true, '41 F. Ramos Street, Cebu City', 10.307688, 123.896848, '+63 32253187179'),
    ('relation/17697806', 'Chong Hua Hospital', 'er_hospital', true, 'Don Mariano Cui Street, Cebu City', 10.310048, 123.8912, NULL),
    ('relation/19083653', 'North General Hospital', 'er_hospital', true, 'Kauswagan Road, Talamban, Cebu City', 10.373203, 123.914556, '+63 323437777'),
    ('relation/18219761', 'Perpetual Succour Hospital', 'er_hospital', true, 'PSH Road, Cebu City', 10.314839, 123.899589, '+63322338620'),
    ('way/156274043', 'Saint Vincent''s General Hospital', 'er_hospital', true, 'R. R. Landon Extension, Cebu City', 10.302027, 123.894817, NULL),
    ('relation/17012112', 'Vicente Sotto Memorial Medical Center', 'er_hospital', true, 'B. Rodriquez Street, Cebu City', 10.307831, 123.891657, NULL),
    ('way/1418853452', 'VisayasMed Hospital', 'er_hospital', true, '85 Osmeña Blvd, Brgy Sta Cruz, Cebu City', 10.306459, 123.89511, '+6332 2531901'),
    ('way/1330059248', 'Cebu City Medical Center', 'hospital', NULL, 'Cebu City', 10.297416, 123.891508, NULL),
    ('way/612407069', 'SWU PHINMA Hospital', 'hospital', NULL, 'J. Urgello Street, Cebu City', 10.303591, 123.892166, NULL),
    ('node/4340937722', 'Alaska Mambaling Barangay Health Center', 'health_center', NULL, 'Cebu City', 10.289512, 123.881803, NULL),
    ('node/4942410126', 'Barangay Luz Health Center', 'health_center', NULL, 'Cebu City', 10.323672, 123.906205, NULL),
    ('way/1368629884', 'Ermita Health Center', 'health_center', NULL, 'Escaño Street, Cebu City', 10.290881, 123.897501, NULL),
    ('node/2179391644', 'Mambaling Health Center', 'health_center', NULL, 'Cebu City', 10.292136, 123.87649, NULL),
    ('node/4340940589', 'Pardo Health Center', 'health_center', NULL, 'Natalio Bacalso Avenue, Poblacion Pardo, Cebu City', 10.279212, 123.855603, '+63 322726645'),
    ('node/13040661450', 'Pari-an Health Center', 'health_center', NULL, 'Sikatuna Street, Cebu City', 10.299174, 123.90316, NULL),
    ('node/13030791885', 'Punta Princesa Health Center', 'health_center', NULL, 'Cebu City', 10.295714, 123.87306, NULL),
    ('node/7141264185', 'Cebu Sagrada Corazon Health Services, Inc.', 'clinic', NULL, 'Cebu City', 10.294511, 123.903078, '+6332 2551180'),
    ('way/1147544412', 'Chong Hua Medical Mall', 'clinic', NULL, 'J. Llorente Street, Cebu City', 10.309743, 123.889549, NULL),
    ('node/11555599369', 'City Doctors Med Clinic And Pharmacy', 'clinic', NULL, 'Cebu City', 10.29757, 123.879503, NULL),
    ('node/5846373352', 'Dr. Alicia Yuipco- Delfin Clinic', 'clinic', NULL, 'Cebu City', 10.285459, 123.871466, NULL),
    ('node/4441554193', 'Dr. Wilfredo Ypil Clinic', 'clinic', NULL, 'F. Ramos Street, Cebu City', 10.307564, 123.896295, NULL),
    ('node/4122422390', 'Fortune Care Clinic', 'clinic', NULL, 'Osmeña Boulevard, Cebu City', 10.298904, 123.897211, NULL),
    ('node/380438493', 'Friendly Care Clinic', 'clinic', NULL, 'Cebu City', 10.294229, 123.905666, NULL),
    ('node/5519778825', 'Kaiser Mecial Clinic', 'clinic', NULL, 'Cebu City', 10.280497, 123.880743, NULL),
    ('way/150954402', 'Maxicare Healthcare Corporation - Primary Care Center', 'clinic', NULL, 'Mindanao Avenue, Cebu City', 10.319385, 123.907091, NULL),
    ('way/1257380167', 'Montejo Medical Clinic', 'clinic', NULL, '559 I. Tabura Street, Cebu City', 10.280601, 123.856167, NULL),
    ('node/5482131841', 'MyHealth Clinic', 'clinic', NULL, 'Cebu City', 10.310029, 123.892003, NULL),
    ('way/895442392', 'Nationwide Health Systems', 'clinic', NULL, 'Sanciangko Street, Cebu City', 10.297042, 123.894454, NULL),
    ('node/7843264785', 'St Peter - Paul Medical Clinic', 'clinic', NULL, 'Colon Street, Cebu City', 10.297792, 123.90255, NULL),
    ('way/1443596510', 'Sugbo Bagong Urgent Care and Ambulatory Services Center', 'clinic', NULL, 'Cebu City', 10.331567, 123.894309, '+6332 254 0436'),
    ('way/425699296', 'SuperCare Medical Services Inc. - Cebu', 'clinic', NULL, 'General Maxilom Avenue Extension, Cebu City', 10.310544, 123.896734, NULL),
    ('node/5519793521', 'The One Family Clinic & Laboratory', 'clinic', NULL, 'Cebu City', 10.315093, 123.884372, NULL),
    ('way/286883114', 'Uy Medical Clinic', 'clinic', NULL, 'Tres de Abril Street, Cebu City', 10.296986, 123.885536, NULL)
) AS v(osm_id, name, kind, has_er, address, latitude, longitude, phone)
ON CONFLICT (osm_id) DO UPDATE SET
    name = EXCLUDED.name,
    kind = EXCLUDED.kind,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    has_er = CASE WHEN public.clinics.checked_at IS NULL THEN EXCLUDED.has_er ELSE public.clinics.has_er END,
    phone = CASE WHEN public.clinics.phone_verified THEN public.clinics.phone ELSE EXCLUDED.phone END;
