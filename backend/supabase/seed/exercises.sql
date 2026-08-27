-- backend/supabase/seed/exercises.sql
-- Seed Global Exercise Routines Library

INSERT INTO public.exercise_routines (
    id, legacy_id, name, description, duration_minutes, hss_tier, type, intensity, goal,
    steps, media_url, video_url, guide_images, status, expert_validated, created_at
)
VALUES
(
    'e6010000-0000-0000-0000-000000000601',
    'rout-601',
    'Basal Paced Breathing Exercise',
    'Controlled deep vagus nerve activation breathing patterns to downregulate stress spikes.',
    10,
    'Stable',
    'Breathing',
    'None',
    'Downregulate sympathetic nervous activation tracking matrices',
    '[
        {"id": "step-1", "instruction": "Sit comfortably in upright position.", "duration_seconds": 10, "type": "instruction", "voice_cue": "Sit upright."},
        {"id": "breath-1", "instruction": "Inhale smoothly through nostrils.", "duration_seconds": 4, "type": "breathing", "phase": "inhale", "voice_cue": "Inhale."},
        {"id": "breath-2", "instruction": "Hold basal volume.", "duration_seconds": 2, "type": "breathing", "phase": "hold", "voice_cue": "Hold."},
        {"id": "breath-3", "instruction": "Exhale silently through mouth.", "duration_seconds": 6, "type": "breathing", "phase": "exhale", "voice_cue": "Exhale."}
    ]'::jsonb,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop',
    'https://www.youtube.com/watch?v=DbDoBzGY3vo',
    ARRAY[]::TEXT[],
    'published',
    true,
    '2026-05-01T11:00:00Z'
),
(
    'e6020000-0000-0000-0000-000000000602',
    'rout-602',
    '20-Minute Neighborhood Walk',
    'Light cardio to improve circulation without overexertion.',
    20,
    'Stable',
    'Light Cardio',
    'Low',
    'Improves blood circulation and builds gentle endurance.',
    '[
        {"id": "step-1", "instruction": "Warm up with light stretching.", "duration_seconds": 120, "type": "instruction", "voice_cue": "Warm up."},
        {"id": "step-2", "instruction": "Walk at a comfortable, conversational pace.", "duration_seconds": 900, "type": "instruction", "voice_cue": "Walk at a comfortable pace."},
        {"id": "step-3", "instruction": "Cool down with a slower pace.", "duration_seconds": 180, "type": "instruction", "voice_cue": "Cool down."}
    ]'::jsonb,
    'https://images.unsplash.com/photo-1522898467493-49726bf28798?w=600&h=400&fit=crop',
    'https://www.youtube.com/watch?v=njeZ29umqVE',
    ARRAY[]::TEXT[],
    'published',
    true,
    '2026-06-01T08:00:00Z'
),
(
    'e6030000-0000-0000-0000-000000000603',
    'rout-603',
    'Basic Standing Stretches',
    'Gentle stretching to relieve muscle tension.',
    10,
    'Stable',
    'Stationary',
    'Low',
    'Enhances flexibility without straining the heart.',
    '[
        {"id": "step-1", "instruction": "Reach arms overhead and hold.", "duration_seconds": 15, "type": "instruction", "voice_cue": "Reach arms overhead."},
        {"id": "step-2", "instruction": "Gently rotate shoulders backward 10 times.", "duration_seconds": 30, "type": "instruction", "voice_cue": "Rotate shoulders."},
        {"id": "step-3", "instruction": "Perform side bends holding each side.", "duration_seconds": 20, "type": "instruction", "voice_cue": "Perform side bends."}
    ]'::jsonb,
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=400&fit=crop',
    'https://www.youtube.com/watch?v=5WEBMhRc_9M',
    ARRAY[
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop'
    ],
    'published',
    true,
    '2026-06-05T09:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
