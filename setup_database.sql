-- setup_database.sql
-- 0. Supprimer toutes les tables existantes (ATTENTION : cela effacera toutes les données !)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS argos_messages CASCADE;
DROP TABLE IF EXISTS argos_discussions CASCADE;
DROP TABLE IF EXISTS radiotherapies CASCADE;
DROP TABLE IF EXISTS imaging_studies CASCADE;
DROP TABLE IF EXISTS surgeries CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS measures CASCADE;
DROP TABLE IF EXISTS biomarkers CASCADE;
DROP TABLE IF EXISTS biological_specimens CASCADE;
DROP TABLE IF EXISTS tumor_sizes CASCADE;
DROP TABLE IF EXISTS tnm_events CASCADE;
DROP TABLE IF EXISTS tumor_patho_events CASCADE;
DROP TABLE IF EXISTS primary_cancer_stages CASCADE;
DROP TABLE IF EXISTS primary_cancer_grades CASCADE;
DROP TABLE IF EXISTS primary_cancers CASCADE;
DROP TABLE IF EXISTS patient_access CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Table des utilisateurs (doit être créée en premier)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('clinician', 'researcher', 'admin')),
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Table des patients avec les colonnes CORRIGÉES
CREATE TABLE patients (
    id_patient SERIAL PRIMARY KEY,                -- Changé de "id" à "id_patient"
    name VARCHAR(255),                            -- Ajout de la colonne "name"
    ipp VARCHAR(50) UNIQUE NOT NULL,
    birth_date_year INTEGER,
    birth_date_month INTEGER,
    birth_date_day INTEGER,
    sex VARCHAR(10) CHECK (sex IN ('MALE', 'FEMALE', 'OTHER')),
    condition TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    health_info JSONB,
    death_date_year INTEGER,
    death_date_month INTEGER,
    last_visit_date_year INTEGER,
    last_visit_date_month INTEGER,
    last_news_date_year INTEGER,
    last_news_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- 3. Table des cancers primaires (MAJ de la référence)
CREATE TABLE primary_cancers (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    cancer_order INTEGER,
    topography_code VARCHAR(20),
    topography_group VARCHAR(100),
    morphology_code VARCHAR(20),
    morphology_group VARCHAR(100),
    cancer_diagnosis_date_year INTEGER,
    cancer_diagnosis_date_month INTEGER,
    laterality VARCHAR(50),
    cancer_diagnosis_in_center BOOLEAN,
    cancer_diagnosis_method VARCHAR(100),
    cancer_diagnosis_code VARCHAR(50),
    cancer_care_in_center BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des grades des cancers
CREATE TABLE primary_cancer_grades (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    grade_value VARCHAR(50),
    grade_system VARCHAR(100),
    grade_date_year INTEGER,
    grade_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des stades des cancers
CREATE TABLE primary_cancer_stages (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    staging_system VARCHAR(100),
    t_stage VARCHAR(10),
    n_stage VARCHAR(10),
    m_stage VARCHAR(10),
    overall_stage VARCHAR(20),
    stage_date_year INTEGER,
    stage_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table des événements tumoraux
CREATE TABLE tumor_patho_events (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    event_type VARCHAR(100),
    event_date_year INTEGER,
    event_date_month INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Table des événements TNM
CREATE TABLE tnm_events (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    tnm_version VARCHAR(20),
    t_category VARCHAR(10),
    n_category VARCHAR(10),
    m_category VARCHAR(10),
    event_date_year INTEGER,
    event_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Table des tailles tumorales
CREATE TABLE tumor_sizes (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    size_value DECIMAL(10,2),
    size_unit VARCHAR(10),
    measurement_method VARCHAR(100),
    measurement_date_year INTEGER,
    measurement_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Table des échantillons biologiques (MAJ de la référence)
CREATE TABLE biological_specimens (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    specimen_identifier VARCHAR(100) UNIQUE NOT NULL,
    specimen_collect_date_month INTEGER,
    specimen_collect_date_year INTEGER,
    specimen_type VARCHAR(50) CHECK (specimen_type IN ('BIOPSY', 'SURGERY', 'BLOOD', 'OTHER')),
    specimen_nature VARCHAR(50) CHECK (specimen_nature IN ('TUMORAL', 'BENIGN', 'NORMAL', 'METASTATIC')),
    specimen_topography_code VARCHAR(20),
    imaging_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Table des biomarqueurs
CREATE TABLE biomarkers (
    id SERIAL PRIMARY KEY,
    specimen_id INTEGER NOT NULL REFERENCES biological_specimens(id) ON DELETE CASCADE,
    biomarker_name VARCHAR(200) NOT NULL,
    biomarker_value TEXT,
    biomarker_unit VARCHAR(50),
    test_method VARCHAR(100),
    test_date_year INTEGER,
    test_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Table des mesures (taille, poids) (MAJ de la référence)
CREATE TABLE measures (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    measure_type VARCHAR(50) CHECK (measure_type IN ('HEIGHT', 'WEIGHT', 'BMI', 'BLOOD_PRESSURE', 'OTHER')),
    measure_value DECIMAL(10,2),
    measure_unit VARCHAR(20),
    measure_date_year INTEGER,
    measure_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Table des médicaments (MAJ de la référence)
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    start_date_year INTEGER,
    start_date_month INTEGER,
    end_date_year INTEGER,
    end_date_month INTEGER,
    indication TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Table des chirurgies (MAJ de la référence)
CREATE TABLE surgeries (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    surgery_type VARCHAR(200),
    surgery_date_year INTEGER,
    surgery_date_month INTEGER,
    topography_code VARCHAR(20),
    procedure_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Table des imageries (MAJ de la référence)
CREATE TABLE imaging_studies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    study_type VARCHAR(100),
    study_date_year INTEGER,
    study_date_month INTEGER,
    body_part VARCHAR(100),
    findings TEXT,
    report_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Table des radiothérapies (MAJ de la référence)
CREATE TABLE radiotherapies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    modality VARCHAR(100),
    total_dose DECIMAL(10,2),
    dose_unit VARCHAR(20),
    fractions INTEGER,
    start_date_year INTEGER,
    start_date_month INTEGER,
    end_date_year INTEGER,
    end_date_month INTEGER,
    target_site VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Table des discussions ARGOS (MAJ des références)
CREATE TABLE argos_discussions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    clinician_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(200),
    context TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Table des messages ARGOS
CREATE TABLE argos_messages (
    id SERIAL PRIMARY KEY,
    discussion_id INTEGER NOT NULL REFERENCES argos_discussions(id) ON DELETE CASCADE,
    message_type VARCHAR(20) CHECK (message_type IN ('user_query', 'argos_response', 'clinician_note')),
    content TEXT NOT NULL,
    clinical_summary TEXT,
    hypotheses_options JSONB,
    arguments JSONB,
    next_steps JSONB,
    traceability JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- 18. Table des logs d'activité
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Table des accès aux patients (MAJ des références)
CREATE TABLE patient_access (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,  -- Changé ici
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) CHECK (access_level IN ('full', 'read_only', 'limited')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(patient_id, user_id)
);

-- 20. Index pour améliorer les performances (MAJ des noms de colonnes)
CREATE INDEX idx_patients_ipp ON patients(ipp);
CREATE INDEX idx_patients_name ON patients(name);  -- Nouvel index pour la colonne name
CREATE INDEX idx_patients_created_by ON patients(created_by);
CREATE INDEX idx_primary_cancers_patient_id ON primary_cancers(patient_id);
CREATE INDEX idx_biological_specimens_patient_id ON biological_specimens(patient_id);
CREATE INDEX idx_measures_patient_id ON measures(patient_id);
CREATE INDEX idx_argos_discussions_patient_id ON argos_discussions(patient_id);
CREATE INDEX idx_argos_discussions_clinician_id ON argos_discussions(clinician_id);
CREATE INDEX idx_argos_messages_discussion_id ON argos_messages(discussion_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- 21. Insérer des données de test
-- Tous les mots de passe sont "password" en environnement de démo
INSERT INTO users (username, email, password_hash, role, full_name) VALUES
('admin', 'admin@arcane.com', '$2a$10$YourHashedPasswordHere', 'admin', 'Administrateur System'),
('dr.martin', 'martin@hospital.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr. Martin Dupont'),
('researcher.jane', 'jane@research.com', '$2a$10$YourHashedPasswordHere', 'researcher', 'Jane Doe');

-- Comptes supplémentaires pour tester les nouveaux flux d'authentification
-- Cliniciens en attente de validation (is_active = FALSE)
INSERT INTO users (username, email, password_hash, role, full_name, is_active) VALUES
('pending.clin1', 'pending1@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr. Pending One', FALSE),
('pending.clin2', 'pending2@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr. Pending Two', FALSE);

-- Clinicien désactivé (simule un compte rejeté / bloqué)
INSERT INTO users (username, email, password_hash, role, full_name, is_active) VALUES
('disabled.clin', 'disabled@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr. Disabled', FALSE);

INSERT INTO patients (name, ipp, birth_date_year, birth_date_month, sex, created_by, updated_by) VALUES
('Jean Dupont', 'PAT001', 1960, 5, 'MALE', 1, 1),
('Marie Curie', 'PAT002', 1975, 8, 'FEMALE', 1, 1),
('Pierre Martin', 'PAT003', 1955, 2, 'MALE', 2, 2),
('Sophie Bernard', 'PAT004', 1982, 11, 'FEMALE', 2, 2);

-- 22. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BASE DE DONNÉES ARCANE RECONSTRUITE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Tables créées avec succès (19 tables)';
    RAISE NOTICE '✓ Colonnes corrigées : patients.id_patient et patients.name';
    RAISE NOTICE '✓ Données de test insérées';
    RAISE NOTICE '✓ Toutes les références mises à jour';
    RAISE NOTICE '========================================';
END $$;
