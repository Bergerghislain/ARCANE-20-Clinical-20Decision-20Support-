-- setup_database.sql
-- Rebuild complete ARCANE schema from scratch.

-- 0) Drop existing tables (destructive)
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

-- 1) Users
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

-- 2) Patients
-- Rule: each patient is assigned to one and only one clinician.
CREATE TABLE patients (
    id_patient SERIAL PRIMARY KEY,
    name VARCHAR(255),
    ipp VARCHAR(50) UNIQUE NOT NULL,
    birth_date_year INTEGER,
    birth_date_month INTEGER,
    birth_date_day INTEGER,
    birth_date DATE,
    birth_date_precision VARCHAR(10) CHECK (birth_date_precision IN ('year', 'month', 'day')),
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
    assigned_clinician_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- 3) Primary cancers
CREATE TABLE primary_cancers (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
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

-- 4) Primary cancer grades
CREATE TABLE primary_cancer_grades (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    grade_value VARCHAR(50),
    grade_system VARCHAR(100),
    grade_date_year INTEGER,
    grade_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5) Primary cancer stages
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

-- 6) Tumor pathology events
CREATE TABLE tumor_patho_events (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    event_type VARCHAR(100),
    event_date_year INTEGER,
    event_date_month INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7) TNM events
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

-- 8) Tumor sizes
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

-- 9) Biological specimens
CREATE TABLE biological_specimens (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    specimen_identifier VARCHAR(100) UNIQUE NOT NULL,
    specimen_collect_date_month INTEGER,
    specimen_collect_date_year INTEGER,
    specimen_type VARCHAR(50) CHECK (specimen_type IN ('BIOPSY', 'SURGERY', 'BLOOD', 'OTHER')),
    specimen_nature VARCHAR(50) CHECK (specimen_nature IN ('TUMORAL', 'BENIGN', 'NORMAL', 'METASTATIC')),
    specimen_topography_code VARCHAR(20),
    imaging_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10) Biomarkers
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

-- 11) Measures
CREATE TABLE measures (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    measure_type VARCHAR(50) CHECK (measure_type IN ('HEIGHT', 'WEIGHT', 'BMI', 'BLOOD_PRESSURE', 'OTHER')),
    measure_value DECIMAL(10,2),
    measure_unit VARCHAR(20),
    measure_date_year INTEGER,
    measure_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12) Medications
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
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

-- 13) Surgeries
CREATE TABLE surgeries (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    surgery_type VARCHAR(200),
    surgery_date_year INTEGER,
    surgery_date_month INTEGER,
    topography_code VARCHAR(20),
    procedure_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14) Imaging studies
CREATE TABLE imaging_studies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    study_type VARCHAR(100),
    study_date_year INTEGER,
    study_date_month INTEGER,
    body_part VARCHAR(100),
    findings TEXT,
    report_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15) Radiotherapies
CREATE TABLE radiotherapies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
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

-- 16) ARGOS discussions
CREATE TABLE argos_discussions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    clinician_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(200),
    context TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17) ARGOS messages
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

-- 18) Activity logs
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

-- 19) Explicit patient access (optional explicit ACL)
CREATE TABLE patient_access (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) CHECK (access_level IN ('full', 'read_only', 'limited')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(patient_id, user_id)
);

-- 20) Indexes
CREATE INDEX idx_patients_ipp ON patients(ipp);
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_patients_assigned_clinician_id ON patients(assigned_clinician_id);
CREATE INDEX idx_patients_created_by ON patients(created_by);
CREATE INDEX idx_primary_cancers_patient_id ON primary_cancers(patient_id);
CREATE INDEX idx_biological_specimens_patient_id ON biological_specimens(patient_id);
CREATE INDEX idx_measures_patient_id ON measures(patient_id);
CREATE INDEX idx_argos_discussions_patient_id ON argos_discussions(patient_id);
CREATE INDEX idx_argos_discussions_clinician_id ON argos_discussions(clinician_id);
CREATE INDEX idx_argos_messages_discussion_id ON argos_messages(discussion_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- 21) Seed users
-- All demo passwords are "password" with demo fallback enabled.
INSERT INTO users (username, email, password_hash, role, full_name, is_active) VALUES
('admin', 'admin@arcane.com', '$2a$10$YourHashedPasswordHere', 'admin', 'Administrateur System', TRUE),
('dr.martin', 'martin@hospital.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Martin Dupont', TRUE),
('dr.leclerc', 'leclerc@hospital.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Lea Leclerc', TRUE),
('researcher.jane', 'jane@research.com', '$2a$10$YourHashedPasswordHere', 'researcher', 'Jane Doe', TRUE),
('pending.clin1', 'pending1@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Pending One', FALSE),
('pending.clin2', 'pending2@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Pending Two', FALSE),
('disabled.clin', 'disabled@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Disabled', FALSE);

-- 22) Seed patients
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
('Sophie Bernard', 'PAT004', 1982, 11, DATE '1982-11-01', 'month', 'FEMALE', 2, 2, 3);

-- 23) Completion notice
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCANE DATABASE REBUILT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created successfully.';
    RAISE NOTICE 'Patient assignment enabled (1 patient -> 1 clinician).';
    RAISE NOTICE 'Birth date DATE + precision columns available.';
    RAISE NOTICE '========================================';
END $$;
/*
-- Legacy duplicated content below is intentionally ignored.
-- The canonical schema starts at file top and ends above.
-- setup_database.sql
-- Rebuild complete ARCANE schema from scratch.

-- 0) Drop existing tables (destructive)
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

-- 1) Users
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

-- 2) Patients
-- Rule: each patient is assigned to one and only one clinician.
CREATE TABLE patients (
    id_patient SERIAL PRIMARY KEY,
    name VARCHAR(255),
    ipp VARCHAR(50) UNIQUE NOT NULL,
    birth_date_year INTEGER,
    birth_date_month INTEGER,
    birth_date_day INTEGER,
    birth_date DATE,
    birth_date_precision VARCHAR(10) CHECK (birth_date_precision IN ('year', 'month', 'day')),
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
    assigned_clinician_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- 3) Primary cancers
CREATE TABLE primary_cancers (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
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

-- 4) Primary cancer grades
CREATE TABLE primary_cancer_grades (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    grade_value VARCHAR(50),
    grade_system VARCHAR(100),
    grade_date_year INTEGER,
    grade_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5) Primary cancer stages
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

-- 6) Tumor pathology events
CREATE TABLE tumor_patho_events (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    event_type VARCHAR(100),
    event_date_year INTEGER,
    event_date_month INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7) TNM events
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

-- 8) Tumor sizes
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

-- 9) Biological specimens
CREATE TABLE biological_specimens (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    specimen_identifier VARCHAR(100) UNIQUE NOT NULL,
    specimen_collect_date_month INTEGER,
    specimen_collect_date_year INTEGER,
    specimen_type VARCHAR(50) CHECK (specimen_type IN ('BIOPSY', 'SURGERY', 'BLOOD', 'OTHER')),
    specimen_nature VARCHAR(50) CHECK (specimen_nature IN ('TUMORAL', 'BENIGN', 'NORMAL', 'METASTATIC')),
    specimen_topography_code VARCHAR(20),
    imaging_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10) Biomarkers
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

-- 11) Measures
CREATE TABLE measures (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    measure_type VARCHAR(50) CHECK (measure_type IN ('HEIGHT', 'WEIGHT', 'BMI', 'BLOOD_PRESSURE', 'OTHER')),
    measure_value DECIMAL(10,2),
    measure_unit VARCHAR(20),
    measure_date_year INTEGER,
    measure_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12) Medications
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
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

-- 13) Surgeries
CREATE TABLE surgeries (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    surgery_type VARCHAR(200),
    surgery_date_year INTEGER,
    surgery_date_month INTEGER,
    topography_code VARCHAR(20),
    procedure_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14) Imaging studies
CREATE TABLE imaging_studies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    study_type VARCHAR(100),
    study_date_year INTEGER,
    study_date_month INTEGER,
    body_part VARCHAR(100),
    findings TEXT,
    report_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15) Radiotherapies
CREATE TABLE radiotherapies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
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

-- 16) ARGOS discussions
CREATE TABLE argos_discussions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    clinician_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(200),
    context TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17) ARGOS messages
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

-- 18) Activity logs
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

-- 19) Explicit patient access (optional explicit ACL)
CREATE TABLE patient_access (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) CHECK (access_level IN ('full', 'read_only', 'limited')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(patient_id, user_id)
);

-- 20) Indexes
CREATE INDEX idx_patients_ipp ON patients(ipp);
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_patients_assigned_clinician_id ON patients(assigned_clinician_id);
CREATE INDEX idx_patients_created_by ON patients(created_by);
CREATE INDEX idx_primary_cancers_patient_id ON primary_cancers(patient_id);
CREATE INDEX idx_biological_specimens_patient_id ON biological_specimens(patient_id);
CREATE INDEX idx_measures_patient_id ON measures(patient_id);
CREATE INDEX idx_argos_discussions_patient_id ON argos_discussions(patient_id);
CREATE INDEX idx_argos_discussions_clinician_id ON argos_discussions(clinician_id);
CREATE INDEX idx_argos_messages_discussion_id ON argos_messages(discussion_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- 21) Seed users
-- All demo passwords are "password" with demo fallback enabled.
INSERT INTO users (username, email, password_hash, role, full_name, is_active) VALUES
('admin', 'admin@arcane.com', '$2a$10$YourHashedPasswordHere', 'admin', 'Administrateur System', TRUE),
('dr.martin', 'martin@hospital.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Martin Dupont', TRUE),
('dr.leclerc', 'leclerc@hospital.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Lea Leclerc', TRUE),
('researcher.jane', 'jane@research.com', '$2a$10$YourHashedPasswordHere', 'researcher', 'Jane Doe', TRUE),
('pending.clin1', 'pending1@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Pending One', FALSE),
('pending.clin2', 'pending2@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Pending Two', FALSE),
('disabled.clin', 'disabled@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr Disabled', FALSE);

-- 22) Seed patients
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
('Sophie Bernard', 'PAT004', 1982, 11, DATE '1982-11-01', 'month', 'FEMALE', 2, 2, 3);

-- 23) Completion notice
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCANE DATABASE REBUILT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created successfully.';
    RAISE NOTICE 'Patient assignment enabled (1 patient -> 1 clinician).';
    RAISE NOTICE 'Birth date DATE + precision columns available.';
    RAISE NOTICE '========================================';
END $$;
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
    birth_date DATE,
    birth_date_precision VARCHAR(10) CHECK (birth_date_precision IN ('year', 'month', 'day')),
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


-- 1) Créer un compte admin s'il n'existe pas encore
INSERT INTO users (username, email, password_hash, role, full_name, is_active)
SELECT 'admin', 'admin@arcane.com', '$2a$10$YourHashedPasswordHere', 'admin', 'Administrateur System', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@arcane.com'
);

-- 2) Créer deux cliniciens EN_ATTENTE (is_active = FALSE)
INSERT INTO users (username, email, password_hash, role, full_name, is_active)
SELECT 'pending.clin1', 'pending1@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr. Pending One', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'pending1@arcane.com'
);

INSERT INTO users (username, email, password_hash, role, full_name, is_active)
SELECT 'pending.clin2', 'pending2@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr. Pending Two', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'pending2@arcane.com'
);

-- 3) Un clinicien désactivé (simuler REJETÉ)
INSERT INTO users (username, email, password_hash, role, full_name, is_active)
SELECT 'disabled.clin', 'disabled@arcane.com', '$2a$10$YourHashedPasswordHere', 'clinician', 'Dr. Disabled', FALSE
WHERE NOT EXISTS (1. Contexte général de l’authentification dans ARCANE
Avant (Express “cosmétique”)

Backend en Express, route /api/auth/login qui renvoyait un “token” simple (arcane_<id>_<timestamp>) sans véritable vérification serveur ensuite.
Le frontend stockait ce token en localStorage et l’envoyait parfois, mais il n’y avait pas de vrai contrôle d’accès serveur (les routes patients n’étaient pas réellement protégées).
Pas de refresh token, pas de RBAC sérieux, ni de workflow d’activation de compte.
Maintenant (FastAPI robuste)

Backend migré vers FastAPI avec :
Authentification par JWT d’accès (access token) signé côté serveur.
Refresh token stocké en cookie HttpOnly sécurisé pour le confort utilisateur et réduire le risque XSS.
RBAC (Role-Based Access Control) : rôles clinician, researcher, admin appliqués au niveau des endpoints.
Workflow d’inscription / validation admin conforme à tes diagrammes (compte créé inactif, visible en admin, puis validation).
Frontend React :
Un wrapper apiFetch qui ajoute automatiquement Authorization: Bearer <token> et gère le refresh en cas de 401.
Pages dédiées : Login, Register, AdminUsers, ArgosSpace, etc.
2. Architecture technique actuelle de l’authent / RBAC
2.1 Backend FastAPI – fichiers clés
security.py (déjà en place avant aujourd’hui)

Hashage des mots de passe avec bcrypt via passlib (pwd_context).
Fonctions create_access_token et create_refresh_token (JWT avec python-jose), et decode_token / decode_refresh_token.
Vérification des mots de passe avec une tolérance spéciale pour les comptes de démo (ex: accepter "password" sur certains hash placeholder).
deps.py

Dépendances FastAPI pour la sécurité :
Décodage du JWT d’accès, récupération de l’utilisateur courant en base.
Factories require_role(...) qui imposent un rôle minimum.
Alias pratiques : AdminUser, ClinicianUser, ClinicianOrAdminUser.
Routers :

routers/auth.py :

POST /api/auth/login

Récupère l’utilisateur par email ou username.
Vérifie le mot de passe (verify_password).
Vérifie is_active (compte validé ou non).
Génère un access token + refresh token (ce dernier dans un cookie HttpOnly via _set_refresh_cookie).
Renvoye LoginOut { token, user }.
POST /api/auth/refresh

Lit le refresh token dans le cookie arcane_refresh_token.
Vérifie le JWT de refresh et re-génère un nouvel access token (+ éventuellement un nouveau refresh).
Sert de point unique pour prolonger la session sans redemander le mot de passe.
POST /api/auth/logout

Supprime le cookie de refresh (_clear_refresh_cookie).
POST /api/auth/register (thème du jour)

Valide les données d’entrée via le modèle Pydantic RegisterIn.
Vérifie l’unicité email / username.
Hash le mot de passe avec bcrypt.
Insère un utilisateur en rôle clinician et is_active = FALSE (compte en attente de validation).
Renvoye un message clair :
"Account created, pending admin validation".
routers/admin.py :

GET /api/admin/users?status=EN_ATTENTE|ACTIF|REJETE pour lister les comptes.
POST /api/admin/users/{id}/validate pour approuver ou rejeter un compte (mise à jour de is_active et éventuellement du rôle).
routers/patients.py / argos.py :

Protégés avec les dépendances RBAC (par ex. ClinicianOrAdminUser), pour faire respecter les rôles sur les données cliniques et sur ARGOS.
2.2 Frontend – flux auth
client/lib/api.ts

Fonction apiFetch(path, init) :
Construit l’URL à partir de VITE_API_BASE_URL (mode FastAPI).
Ajoute automatiquement le header Authorization: Bearer <token> si un token existe.
Force Content-Type: application/json quand on envoie du JSON.
(Dans une version plus avancée : gère une tentative de refresh sur 401 puis rejoue la requête.)
client/pages/Login.tsx

Formulaire de login.
Appelle /api/auth/login via apiFetch.
Si succès : stocke le JWT et l’utilisateur (setAuth) et redirige vers le dashboard.
client/pages/Register.tsx

Formulaire d’inscription clinicien (full_name, email, username, password, passwordConfirm).
Valide côté client : champs obligatoires, cohérence mot de passe / confirmation, mot de passe ≤ 72 caractères.
Appelle /api/auth/register via apiFetch.
Affiche un message de succès “Compte créé. Il sera activé après validation par un administrateur.” puis redirige vers /login.
client/pages/AdminUsers.tsx

Liste les comptes en attente (/api/admin/users?status=EN_ATTENTE).
Boutons pour Valider (APPROVE) ou Rejeter (REJECT), en appelant /api/admin/users/{id}/validate.
3. Ce qui s’est passé aujourd’hui (debug inscription) – étape par étape
Tu peux présenter ça comme un “incident” puis une “résolution” très structurée.

3.1 Symptôme initial
Sur la page Register, le clic sur “Créer le compte” donnait côté UI :
“Failed to fetch”.
Côté FastAPI, les logs montraient :
POST /api/auth/register HTTP/1.1" 500 Internal Server Error
Trace détaillée se terminant par :
ValueError: password cannot be longer than 72 bytes, truncate manually if necessary (e.g. my_password[:72])
Et un warning récurrent :
AttributeError: module 'bcrypt' has no attribute '__about__'.
Résultat : l’API coupait la connexion côté serveur (500) → le navigateur n’avait pas de réponse propre → Failed to fetch.

3.2 Hypothèse 1 – mot de passe utilisateur trop long
Actions :

Côté backend, dans RegisterIn (dans auth.py) :
Ajout de max_length=72 sur le champ password :
password: constr(min_length=8, max_length=72).
Côté frontend, dans Register.tsx :
Ajout d’une validation : if (password.length > 72) {...}.
Ajout de maxLength={72} sur le champ <Input type="password" ... />.
Constat :

On a instrumenté register avec un log NDJSON dans debug-9d5a7f.log pour capturer la longueur effective du mot de passe reçu.
Les logs montraient {"length": 8} → le mot de passe n’était PAS trop long.
Pourtant, la même erreur persistait côté passlib / bcrypt.
→ Hypothèse 1 rejetée : le problème n’était pas la longueur réelle du mot de passe de l’utilisateur, mais quelque chose d’interne au couple passlib / bcrypt.

3.3 Hypothèse 2 – incompatibilité passlib / bcrypt 4.x
Analyse de la stacktrace :

On observe que l’erreur ValueError: password cannot be longer than 72 bytes... survient dans une fonction interne de passlib appelée detect_wrap_bug(IDENT_2A) qui fait un auto-test avec un secret interne, pas ton mot de passe.
Juste avant, on a l’AttributeError: module 'bcrypt' has no attribute '__about__', qui est un symptôme connu d’incompatibilité entre :
passlib 1.7.x, et
bcrypt 4.x (nouvelles versions).
Interprétation :

passlib essaie de détecter certains bugs de compatibilité en appelant bcrypt.hashpw avec un “mot de passe” très long → sur bcrypt 4.x, ça lève un ValueError.
Comme passlib ne gère pas correctement le cas, l’exception remonte jusqu’au handler FastAPI → 500.
Donc, même avec un mot de passe utilisateur correct, l’auto-test interne de passlib casse à cause de bcrypt 4.x.

3.4 Corrections appliquées
Garde défensive côté backend (même si ce n’était pas la racine du bug)
Dans auth.py, route register :

Vérification explicite avant hash :

raw_password = payload.password or ""
if len(raw_password.encode("utf-8")) > 72:
    raise HTTPException(
        status_code=400,
        detail="Password too long (max 72 characters).",
    )
Instrumentation de debug écrivant dans debug-9d5a7f.log pour consigner la longueur exacte du mot de passe reçu (preuve à l’appui).

Puis hash :

password_hash = pwd_context.hash(raw_password)
Cette partie garantit que, même si un bug de front apparaît un jour, le backend répondra 400 (erreur contrôlée) au lieu de 500.

Fix véritable : aligner passlib et bcrypt

Mise à jour de backend_fastapi/requirements.txt pour pinner bcrypt :

python-jose[cryptography]
# Passlib 1.7.x n'est pas encore compatible avec bcrypt 4.x :
# on pince bcrypt à une version < 4.0.0
passlib[bcrypt]
bcrypt<4.0.0
Recommandation d’exécuter dans le venv :

pip uninstall -y bcrypt
pip install "bcrypt==3.2.0"
Objectif : éliminer l’AttributeError: module 'bcrypt' has no attribute '__about__' et empêcher detect_wrap_bug de planter.

Vérification par instrumentation

Après correction, debug-9d5a7f.log montre toujours une longueur de mot de passe raisonnable (8 caractères).
Une fois la bonne version de bcrypt installée, l’endpoint POST /api/auth/register :
Ne lève plus de ValueError interne.
Renvoie soit 201 (création du compte), soit 400 explicite (email déjà utilisé, etc.).
Le “Failed to fetch” disparaît côté UI.
4. Schéma d’évolution globale (de l’ancienne auth à la nouvelle + incident du jour)
Tu peux utiliser ce schéma (par exemple en mermaid) pour montrer au manager la trajectoire :



"Phase 0 – Avant (Express)"
"Phase 1 – Migration FastAPI et sécurisation"
"Phase 2 – Inscription & Admin UI"
"Phase 3 – Incident & Debug du jour"
Express backend\nToken string non vérifié\nRoutes patients non protégées
Frontend React\nStockage localStorage\nPas de RBAC réel
FastAPI backend\nJWT access tokens\nRefresh tokens HttpOnly\nRBAC par rôles
Routes patients protégées\nClinician/Researcher/Admin
Workflow Admin\nListe des comptes en attente\nValidation / Rejet
Frontend – apiFetch\nAjout automatique du header Authorization\nIntégration Refresh
Pages Login / Dashboard / ARGOS
Route POST /api/auth/register\nCréation compte clinician\nis_active=FALSE
Route GET /api/admin/users?status=EN_ATTENTE\nListing comptes à valider
Route POST /api/admin/users/{id}/validate\nAPPROVE/REJECT + rôle
Page Register\nFormulaire Clinicien\nMessages de succès/erreur
Page AdminUsers\nValider/Rejeter comptes
Symptôme\nFailed to fetch côté UI\n500 sur /api/auth/register
Erreur interne\npasslib + bcrypt 4.x\nValueError > 72 bytes
Hypothèse 1\nMot de passe trop long\n→ rejetée par logs
Hypothèse 2\nIncompatibilité de versions\npasslib 1.7.x / bcrypt 4.x
Correctifs\nGarde backend 72 bytes\nValidation front 72 chars\nPin bcrypt<4.0.0
Résultat\nRegister stable\nMessages d'erreur contrôlés\nFin du Failed to fetch
Idée pour ton discours :

“On est parti d’une authentification essentiellement décorative (Express), sans contrôle serveur robuste.”
“On a migré vers FastAPI avec JWT, refresh tokens HttpOnly, RBAC et un vrai workflow admin.”
“On a ensuite ajouté l’inscription clinicien et le tableau de validation admin, puis aujourd’hui, on a géré un incident assez bas niveau lié à la compatibilité passlib/bcrypt. On l’a résolu avec : instrumentation, validation de la taille de mot de passe, et pinning de la version de bcrypt.”
“Résultat : l’authentification est maintenant robuste, observable (logs), et alignée avec les exigences de sécurité de la phase 1.”
  SELECT 1 FROM users WHERE email = 'disabled@arcane.com'
);

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
*/
