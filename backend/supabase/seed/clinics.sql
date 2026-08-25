-- backend/supabase/seed/clinics.sql
-- Seed Medical Clinics

INSERT INTO public.clinics (id, legacy_id, name, doctor, latitude, longitude, phone, specialty, created_at)
VALUES
    ('c1111111-1111-1111-1111-111111111111', '1', 'Chong Hua Hospital Heart Institute', 'Dr. Maria Santos, MD, FACC', 10.3129, 123.8925, '1234567890', 'General Cardiology', '2026-01-01T00:00:00Z'),
    ('c2222222-2222-2222-2222-222222222222', '2', 'Cebu Doctors'' University Hospital', 'Dr. Juan Dela Cruz, MD', 10.3152, 123.8897, '0987654321', 'General Cardiology', '2026-01-01T00:00:00Z'),
    ('c3333333-3333-3333-3333-333333333333', '3', 'Perpetual Succour Hospital', 'Dr. Anna Reyes, MD', 10.3188, 123.8966, '1122334455', 'Cardiac Rehabilitation', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;
