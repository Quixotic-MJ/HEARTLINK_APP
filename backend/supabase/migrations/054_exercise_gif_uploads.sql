-- 054: exercise guide pictures can be GIFs (2026-11-18), so a step can show the movement.
-- The backend checks the file's real type (storage_service.py); this lets the exercises bucket store it too.
-- Only the exercises bucket changes; recipes and avatars stay JPG, PNG and WebP. Safe to run more than once.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
WHERE id = 'exercises';
