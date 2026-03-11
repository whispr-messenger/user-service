-- Test database initialization
-- Drop and recreate public schema for a clean state
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO test;
GRANT ALL ON SCHEMA public TO public;

-- Create application schemas
CREATE SCHEMA IF NOT EXISTS users;
GRANT ALL ON SCHEMA users TO test;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
