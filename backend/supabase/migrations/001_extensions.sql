-- backend/supabase/migrations/001_extensions.sql
-- Enable required extensions for UUID generation and cryptographic operations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set standard timezone to UTC for database sessions
SET timezone = 'UTC';
