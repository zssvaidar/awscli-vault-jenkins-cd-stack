CREATE DATABASE ecom;

\c ecom

-- ============================================
-- USER
-- ============================================

CREATE USER twenty PASSWORD 'twenty';
CREATE USER medusa PASSWORD 'medusa';


-- ============================================
-- SCHEMAS
-- ============================================

-- DROP SCHEMA IF EXISTS cart_service CASCADE;
CREATE SCHEMA IF NOT EXISTS twenty;
CREATE SCHEMA IF NOT EXISTS medusa-store;

-- ============================================
-- CART SERVICE PERMISSIONS
-- ============================================

-- Migrator gets full control
\c ecom

DROP SCHEMA IF EXISTS public CASCADE;

GRANT USAGE, CREATE ON SCHEMA medusa TO medusa;

GRANT ALL PRIVILEGES
    ON DATABASE medusa-store
    TO medusa;

GRANT ALL PRIVILEGES
    ON SCHEMA public
    TO medusa;

GRANT ALL PRIVILEGES
    ON ALL TABLES IN SCHEMA public
    TO medusa;

GRANT ALL PRIVILEGES
    ON ALL SEQUENCES IN SCHEMA public
    TO medusa;


GRANT ALL PRIVILEGES
    ON SCHEMA twenty
    TO twenty;

GRANT ALL PRIVILEGES
    ON ALL TABLES IN SCHEMA twenty
    TO twenty;

GRANT ALL PRIVILEGES
    ON ALL SEQUENCES IN SCHEMA twenty
    TO twenty;