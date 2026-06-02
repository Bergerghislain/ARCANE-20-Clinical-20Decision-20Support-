"""Schéma initial complet ARCANE (source de vérité Alembic).

Cette migration crée l'intégralité du schéma relationnel ARCANE.
Elle est **idempotente** (`CREATE TABLE/INDEX IF NOT EXISTS`) afin de pouvoir
être appliquée :
  - sur une base totalement vide (déploiement neuf via `alembic upgrade head`) ;
  - sur une base déjà créée par l'ancien `setup_database.sql` (on se contente
    alors de l'enregistrer dans `alembic_version`).

Les migrations suivantes (001, 002) restent des ajustements idempotents et
deviennent de simples no-op sur une base créée par cette révision.
"""

from __future__ import annotations

from alembic import op

revision = "000_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


SCHEMA_DDL = """
-- 1) Users
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS patients (
    id_patient SERIAL PRIMARY KEY,
    name VARCHAR(255),
    ipp VARCHAR(50) UNIQUE NOT NULL,
    birth_date_year INTEGER,
    birth_date_month INTEGER,
    birth_date_day INTEGER,
    birth_date DATE,
    birth_date_precision VARCHAR(10) CHECK (birth_date_precision IN ('year', 'month', 'day')),
    sex VARCHAR(10) CHECK (sex IN ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN')),
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

-- 2b) Profils patients
CREATE TABLE IF NOT EXISTS patient_profiles (
    patient_id INTEGER PRIMARY KEY REFERENCES patients(id_patient) ON DELETE CASCADE,
    profile_data JSONB NOT NULL,
    profile_version INTEGER NOT NULL DEFAULT 0,
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_updated ON patient_profiles(updated_at DESC);

-- 3) Primary cancers
CREATE TABLE IF NOT EXISTS primary_cancers (
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
CREATE TABLE IF NOT EXISTS primary_cancer_grades (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    grade_value VARCHAR(50),
    grade_system VARCHAR(100),
    grade_date_year INTEGER,
    grade_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5) Primary cancer stages
CREATE TABLE IF NOT EXISTS primary_cancer_stages (
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
CREATE TABLE IF NOT EXISTS tumor_patho_events (
    id SERIAL PRIMARY KEY,
    primary_cancer_id INTEGER NOT NULL REFERENCES primary_cancers(id) ON DELETE CASCADE,
    event_type VARCHAR(100),
    event_date_year INTEGER,
    event_date_month INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7) TNM events
CREATE TABLE IF NOT EXISTS tnm_events (
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
CREATE TABLE IF NOT EXISTS tumor_sizes (
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
CREATE TABLE IF NOT EXISTS biological_specimens (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    specimen_identifier VARCHAR(100) UNIQUE NOT NULL,
    specimen_collect_date_month INTEGER,
    specimen_collect_date_year INTEGER,
    specimen_type VARCHAR(50) CHECK (specimen_type IN ('BIOPSY', 'SURGERY', 'BLOOD', 'CYTOLOGY', 'OTHER')),
    specimen_nature VARCHAR(50) CHECK (specimen_nature IN ('TUMORAL', 'BENIGN', 'NORMAL', 'METASTATIC', 'OTHER')),
    specimen_topography_code VARCHAR(20),
    imaging_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10) Biomarkers
CREATE TABLE IF NOT EXISTS biomarkers (
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
CREATE TABLE IF NOT EXISTS measures (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    measure_type VARCHAR(50) CHECK (measure_type IN ('HEIGHT', 'WEIGHT', 'BMI', 'BSA', 'BLOOD_PRESSURE', 'OTHER')),
    measure_value DECIMAL(10,2),
    measure_unit VARCHAR(20),
    measure_date_year INTEGER,
    measure_date_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12) Medications
CREATE TABLE IF NOT EXISTS medications (
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
CREATE TABLE IF NOT EXISTS surgeries (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    primary_cancer_id INTEGER REFERENCES primary_cancers(id) ON DELETE SET NULL,
    surgery_type VARCHAR(200),
    surgery_date_year INTEGER,
    surgery_date_month INTEGER,
    topography_code VARCHAR(20),
    procedure_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14) Imaging studies
CREATE TABLE IF NOT EXISTS imaging_studies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    primary_cancer_id INTEGER REFERENCES primary_cancers(id) ON DELETE SET NULL,
    study_type VARCHAR(100),
    study_date_year INTEGER,
    study_date_month INTEGER,
    body_part VARCHAR(100),
    findings TEXT,
    report_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15) Radiotherapies
CREATE TABLE IF NOT EXISTS radiotherapies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id_patient) ON DELETE CASCADE,
    primary_cancer_id INTEGER REFERENCES primary_cancers(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS argos_discussions (
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
CREATE TABLE IF NOT EXISTS argos_messages (
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
CREATE TABLE IF NOT EXISTS activity_logs (
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

-- 19) Explicit patient access
CREATE TABLE IF NOT EXISTS patient_access (
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
CREATE INDEX IF NOT EXISTS idx_patients_ipp ON patients(ipp);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_assigned_clinician_id ON patients(assigned_clinician_id);
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients(created_by);
CREATE INDEX IF NOT EXISTS idx_primary_cancers_patient_id ON primary_cancers(patient_id);
CREATE INDEX IF NOT EXISTS idx_biological_specimens_patient_id ON biological_specimens(patient_id);
CREATE INDEX IF NOT EXISTS idx_measures_patient_id ON measures(patient_id);
CREATE INDEX IF NOT EXISTS idx_argos_discussions_patient_id ON argos_discussions(patient_id);
CREATE INDEX IF NOT EXISTS idx_argos_discussions_clinician_id ON argos_discussions(clinician_id);
CREATE INDEX IF NOT EXISTS idx_argos_messages_discussion_id ON argos_messages(discussion_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
"""


DROP_DDL = """
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
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
"""


def upgrade() -> None:
  op.execute(SCHEMA_DDL)


def downgrade() -> None:
  op.execute(DROP_DDL)
