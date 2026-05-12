-- Migration incrementale: table dediee profils patients (bases existantes).
-- Executer une fois sur la base ARCANE apres mise a jour du code.

CREATE TABLE IF NOT EXISTS patient_profiles (
    patient_id INTEGER PRIMARY KEY REFERENCES patients(id_patient) ON DELETE CASCADE,
    profile_data JSONB NOT NULL,
    profile_version INTEGER NOT NULL DEFAULT 0,
    schema_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_updated ON patient_profiles(updated_at DESC);

-- Optionnel: copier les profils encore dans health_info (ne pas ecraser une ligne existante).
INSERT INTO patient_profiles (patient_id, profile_data, profile_version, schema_version)
SELECT
  p.id_patient,
  (p.health_info->'manual_profile')::jsonb,
  COALESCE(NULLIF(trim(p.health_info->>'manual_profile_version'), '')::integer, 0),
  COALESCE(NULLIF(trim(p.health_info->>'manual_profile_schema_version'), '')::integer, 1)
FROM patients p
WHERE p.health_info ? 'manual_profile'
  AND jsonb_typeof(p.health_info->'manual_profile') = 'object'
ON CONFLICT (patient_id) DO NOTHING;
