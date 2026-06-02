-- setup_database.sql
-- DONNÉES DE DÉMONSTRATION (seeds) UNIQUEMENT.
--
-- IMPORTANT : depuis la migration vers Alembic, le SCHÉMA n'est plus créé ici.
-- La source de vérité du schéma est Alembic :
--     cd backend_fastapi && alembic upgrade head
-- Ce fichier ne contient plus que des INSERT idempotents (ON CONFLICT DO NOTHING),
-- à appliquer APRÈS `alembic upgrade head`.
--
-- Mots de passe de démo : "password" (hash factice + ALLOW_DEMO_PASSWORD_FALLBACK).

-- 1) Seed users
INSERT INTO users (username, email, password_hash, role, full_name, is_active) VALUES
('admin', 'admin@arcane.com', '$2a$10$YourHashedPasswordHere', 'admin', 'Administrateur System', TRUE),
('dr.martin', 'martin@hospital.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Martin Dupont', TRUE),
('dr.leclerc', 'leclerc@hospital.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Lea Leclerc', TRUE),
('researcher.jane', 'jane@research.com', '$2a$10$YourHashedPasswordHere', 'researcher', 'Jane Doe', TRUE),
('pending.clin1', 'pending1@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Pending One', FALSE),
('pending.clin2', 'pending2@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Pending Two', FALSE),
('disabled.clin', 'disabled@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Disabled', FALSE)
ON CONFLICT DO NOTHING;

-- 2) Seed patients
-- assigned_clinician_id / created_by référencent les users seedés ci-dessus.
INSERT INTO patients (
    name,
    ipp,
    birth_date_year,
    birth_date_month,
    birth_date,
    birth_date_precision,
    sex,
    created_by,
    updated_by,
    assigned_clinician_id
) VALUES
('Jean Dupont', 'PAT001', 1960, 5, DATE '1960-05-01', 'month', 'MALE', 1, 1, 2),
('Marie Curie', 'PAT002', 1975, 8, DATE '1975-08-01', 'month', 'FEMALE', 1, 1, 2),
('Pierre Martin', 'PAT003', 1955, 2, DATE '1955-02-01', 'month', 'MALE', 2, 2, 3),
('Sophie Bernard', 'PAT004', 1982, 11, DATE '1982-11-01', 'month', 'FEMALE', 2, 2, 3)
ON CONFLICT DO NOTHING;

-- 3) Completion notice
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCANE SEEDS APPLIQUÉS';
    RAISE NOTICE 'Schéma géré par Alembic (alembic upgrade head).';
    RAISE NOTICE '========================================';
END $$;
