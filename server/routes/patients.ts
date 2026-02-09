import { RequestHandler } from "express";
import pool from "../db";

const normalizeSex = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return ["MALE", "FEMALE", "OTHER"].includes(normalized) ? normalized : null;
};

// GET /api/patients – récupère tous les patients
export const getPatients: RequestHandler = async (_req, res) => {
  const result = await pool.query('SELECT * FROM patients ORDER BY id_patient');
  res.json(result.rows);
};

// GET /api/patients/:id – récupère un patient
export const getPatient: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT * FROM patients WHERE id_patient = $1',
    [id],
  );
  res.json(result.rows[0]);
};

// POST /api/patients – ajoute un patient
export const addPatient: RequestHandler = async (req, res) => {
  const { name, age, gender, ipp, condition, status, birthDate, healthInfo } =
    req.body;
  const birthYear =
    typeof birthDate === "string" && birthDate
      ? new Date(birthDate).getFullYear()
      : typeof age === "number" && Number.isFinite(age)
        ? new Date().getFullYear() - age
        : null;
  const birthMonth =
    typeof birthDate === "string" && birthDate
      ? new Date(birthDate).getMonth() + 1
      : null;
  const birthDay =
    typeof birthDate === "string" && birthDate
      ? new Date(birthDate).getDate()
      : null;
  const normalizedSex = normalizeSex(gender);
  const patientIpp =
    typeof ipp === "string" && ipp.trim()
      ? ipp.trim()
      : `ARC-${Date.now()}`;
  const normalizedStatus =
    typeof status === "string" && status.trim()
      ? status.trim().toLowerCase()
      : "pending";

  const result = await pool.query(
    `INSERT INTO patients (name, ipp, birth_date_year, birth_date_month, birth_date_day, sex, condition, status, health_info)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id_patient`,
    [
      name ?? null,
      patientIpp,
      birthYear,
      birthMonth,
      birthDay,
      normalizedSex,
      condition ?? null,
      normalizedStatus,
      healthInfo ?? null,
    ],
  );
  res.status(201).json({ id: result.rows[0].id_patient });
};

export const updatePatient: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    age,
    gender,
    ipp,
    condition,
    status,
    birthDate,
    birth_date_year,
    birth_date_month,
    birth_date_day,
    healthInfo,
  } = req.body;

  const fields: Array<{ column: string; value: unknown }> = [];

  if ("name" in req.body) fields.push({ column: "name", value: name ?? null });
  if ("ipp" in req.body) fields.push({ column: "ipp", value: ipp ?? null });
  if ("condition" in req.body)
    fields.push({ column: "condition", value: condition ?? null });
  if ("status" in req.body)
    fields.push({
      column: "status",
      value:
        typeof status === "string" && status.trim()
          ? status.trim().toLowerCase()
          : null,
    });
  if ("healthInfo" in req.body)
    fields.push({ column: "health_info", value: healthInfo ?? null });

  if (
    "birthDate" in req.body ||
    "birth_date_year" in req.body ||
    "birth_date_month" in req.body ||
    "birth_date_day" in req.body ||
    "age" in req.body
  ) {
    let birthYear: number | null = null;
    let birthMonth: number | null = null;
    let birthDay: number | null = null;

    if (typeof birthDate === "string" && birthDate) {
      const parsed = new Date(birthDate);
      if (!Number.isNaN(parsed.getTime())) {
        birthYear = parsed.getFullYear();
        birthMonth = parsed.getMonth() + 1;
        birthDay = parsed.getDate();
      }
    } else if (typeof age === "number" && Number.isFinite(age)) {
      birthYear = new Date().getFullYear() - age;
    } else {
      birthYear =
        typeof birth_date_year === "number" ? birth_date_year : null;
      birthMonth =
        typeof birth_date_month === "number" ? birth_date_month : null;
      birthDay = typeof birth_date_day === "number" ? birth_date_day : null;
    }

    fields.push({ column: "birth_date_year", value: birthYear });
    fields.push({ column: "birth_date_month", value: birthMonth });
    fields.push({ column: "birth_date_day", value: birthDay });
  }

  if ("gender" in req.body) {
    fields.push({
      column: "sex",
      value: normalizeSex(gender),
    });
  }

  if (fields.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const setClause = fields
    .map((field, index) => `${field.column} = $${index + 1}`)
    .join(", ");
  const values = fields.map((field) => field.value);

  const result = await pool.query(
    `UPDATE patients SET ${setClause}, updated_at = CURRENT_TIMESTAMP
     WHERE id_patient = $${fields.length + 1}
     RETURNING *`,
    [...values, id],
  );

  res.json(result.rows[0]);
};

export const importPatientJson: RequestHandler = async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.ipp) {
    res.status(400).json({ error: "Missing ipp in payload" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id_patient FROM patients WHERE ipp = $1",
      [payload.ipp],
    );

    const patientValues = {
      ipp: payload.ipp,
      birth_date_year: payload.birthDateYear ?? null,
      birth_date_month: payload.birthDateMonth ?? null,
      birth_date_day: payload.birthDateDay ?? null,
      sex: normalizeSex(payload.sex),
      death_date_year: payload.deathDateYear ?? null,
      death_date_month: payload.deathDateMonth ?? null,
      last_visit_date_year: payload.lastVisitDateYear ?? null,
      last_visit_date_month: payload.lastVisitDateMonth ?? null,
      last_news_date_year: payload.lastNewsDateYear ?? null,
      last_news_date_month: payload.lastNewsDateMonth ?? null,
    };

    let patientId: number;
    if (existing.rowCount > 0) {
      patientId = existing.rows[0].id_patient;
      const fields = Object.entries(patientValues)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value], index) => ({
          column: key,
          value,
          placeholder: `$${index + 1}`,
        }));
      if (fields.length > 0) {
        const setClause = fields
          .map((field) => `${field.column} = ${field.placeholder}`)
          .join(", ");
        const values = fields.map((field) => field.value);
        await client.query(
          `UPDATE patients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id_patient = $${
            fields.length + 1
          }`,
          [...values, patientId],
        );
      }
    } else {
      const insert = await client.query(
        `INSERT INTO patients (
          ipp,
          birth_date_year,
          birth_date_month,
          birth_date_day,
          sex,
          death_date_year,
          death_date_month,
          last_visit_date_year,
          last_visit_date_month,
          last_news_date_year,
          last_news_date_month
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id_patient`,
        [
          patientValues.ipp,
          patientValues.birth_date_year,
          patientValues.birth_date_month,
          patientValues.birth_date_day,
          patientValues.sex,
          patientValues.death_date_year,
          patientValues.death_date_month,
          patientValues.last_visit_date_year,
          patientValues.last_visit_date_month,
          patientValues.last_news_date_year,
          patientValues.last_news_date_month,
        ],
      );
      patientId = insert.rows[0].id_patient;
    }

    const hasPrimaryCancerSurgery = Array.isArray(payload.primaryCancer)
      ? payload.primaryCancer.some((cancer: any) =>
          Array.isArray(cancer.surgery),
        )
      : false;
    const hasPrimaryCancerRadiotherapy = Array.isArray(payload.primaryCancer)
      ? payload.primaryCancer.some((cancer: any) =>
          Array.isArray(cancer.radiotherapy),
        )
      : false;

    if (hasPrimaryCancerSurgery || Array.isArray(payload.surgery)) {
      await client.query("DELETE FROM surgeries WHERE patient_id = $1", [
        patientId,
      ]);
    }

    if (hasPrimaryCancerRadiotherapy) {
      await client.query("DELETE FROM radiotherapies WHERE patient_id = $1", [
        patientId,
      ]);
    }

    if (Array.isArray(payload.primaryCancer)) {
      await client.query("DELETE FROM primary_cancers WHERE patient_id = $1", [
        patientId,
      ]);
      for (const cancer of payload.primaryCancer) {
        const cancerResult = await client.query(
          `INSERT INTO primary_cancers (
            patient_id,
            cancer_order,
            topography_code,
            topography_group,
            morphology_code,
            morphology_group,
            cancer_diagnosis_date_year,
            cancer_diagnosis_date_month,
            laterality,
            cancer_diagnosis_in_center,
            cancer_diagnosis_method,
            cancer_diagnosis_code,
            cancer_care_in_center
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING id`,
          [
            patientId,
            cancer.cancerOrder ?? null,
            cancer.topographyCode ?? null,
            cancer.topographyGroup ?? null,
            cancer.morphologyCode ?? null,
            cancer.morphologyGroup ?? null,
            cancer.cancerDiagnosisDateYear ?? null,
            cancer.cancerDiagnosisDateMonth ?? null,
            cancer.laterality ?? null,
            cancer.cancerDiagnosisInCenter ?? null,
            cancer.cancerDiagnosisMethod ?? null,
            cancer.cancerDiagnosisCode ?? null,
            cancer.cancerCareInCenter ?? null,
          ],
        );
        const primaryCancerId = cancerResult.rows[0].id;

        if (Array.isArray(cancer.primaryCancerGrade)) {
          for (const grade of cancer.primaryCancerGrade) {
            await client.query(
              `INSERT INTO primary_cancer_grades (
                primary_cancer_id, grade_value, grade_system, grade_date_year, grade_date_month
              ) VALUES ($1,$2,$3,$4,$5)`,
              [
                primaryCancerId,
                grade.gradeValue ?? null,
                grade.gradeSystem ?? null,
                grade.gradeDateYear ?? null,
                grade.gradeDateMonth ?? null,
              ],
            );
          }
        }

        if (Array.isArray(cancer.primaryCancerStage)) {
          for (const stage of cancer.primaryCancerStage) {
            await client.query(
              `INSERT INTO primary_cancer_stages (
                primary_cancer_id, staging_system, t_stage, n_stage, m_stage, overall_stage, stage_date_year, stage_date_month
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [
                primaryCancerId,
                stage.stagingSystem ?? null,
                stage.tStage ?? null,
                stage.nStage ?? null,
                stage.mStage ?? null,
                stage.overallStage ?? null,
                stage.stageDateYear ?? null,
                stage.stageDateMonth ?? null,
              ],
            );
          }
        }

        if (Array.isArray(cancer.tumorPathoEvent)) {
          for (const event of cancer.tumorPathoEvent) {
            await client.query(
              `INSERT INTO tumor_patho_events (
                primary_cancer_id, event_type, event_date_year, event_date_month, description
              ) VALUES ($1,$2,$3,$4,$5)`,
              [
                primaryCancerId,
                event.eventType ?? null,
                event.eventDateYear ?? null,
                event.eventDateMonth ?? null,
                event.description ?? null,
              ],
            );
          }
        }

        if (Array.isArray(cancer.tnmEvent)) {
          for (const event of cancer.tnmEvent) {
            await client.query(
              `INSERT INTO tnm_events (
                primary_cancer_id, tnm_version, t_category, n_category, m_category, event_date_year, event_date_month
              ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [
                primaryCancerId,
                event.tnmVersion ?? null,
                event.tCategory ?? null,
                event.nCategory ?? null,
                event.mCategory ?? null,
                event.eventDateYear ?? null,
                event.eventDateMonth ?? null,
              ],
            );
          }
        }

        if (Array.isArray(cancer.tumorSize)) {
          for (const size of cancer.tumorSize) {
            await client.query(
              `INSERT INTO tumor_sizes (
                primary_cancer_id, size_value, size_unit, measurement_method, measurement_date_year, measurement_date_month
              ) VALUES ($1,$2,$3,$4,$5,$6)`,
              [
                primaryCancerId,
                size.sizeValue ?? null,
                size.sizeUnit ?? null,
                size.measurementMethod ?? null,
                size.measurementDateYear ?? null,
                size.measurementDateMonth ?? null,
              ],
            );
          }
        }

        if (Array.isArray(cancer.surgery)) {
          for (const surgery of cancer.surgery) {
            await client.query(
              `INSERT INTO surgeries (
                patient_id, surgery_type, surgery_date_year, surgery_date_month, topography_code, procedure_details
              ) VALUES ($1,$2,$3,$4,$5,$6)`,
              [
                patientId,
                surgery.surgeryType ?? null,
                surgery.surgeryDateYear ?? null,
                surgery.surgeryDateMonth ?? null,
                surgery.topographyCode ?? null,
                surgery.procedureDetails ?? null,
              ],
            );
          }
        }

        if (Array.isArray(cancer.radiotherapy)) {
          for (const radio of cancer.radiotherapy) {
            await client.query(
              `INSERT INTO radiotherapies (
                patient_id, modality, total_dose, dose_unit, fractions, start_date_year, start_date_month, end_date_year, end_date_month, target_site
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [
                patientId,
                radio.modality ?? null,
                radio.totalDose ?? null,
                radio.doseUnit ?? null,
                radio.fractions ?? null,
                radio.startDateYear ?? null,
                radio.startDateMonth ?? null,
                radio.endDateYear ?? null,
                radio.endDateMonth ?? null,
                radio.targetSite ?? null,
              ],
            );
          }
        }
      }
    }

    if (Array.isArray(payload.biologicalSpecimenList)) {
      await client.query(
        "DELETE FROM biological_specimens WHERE patient_id = $1",
        [patientId],
      );
      for (const specimen of payload.biologicalSpecimenList) {
        const specimenResult = await client.query(
          `INSERT INTO biological_specimens (
            patient_id,
            specimen_identifier,
            specimen_collect_date_month,
            specimen_collect_date_year,
            specimen_type,
            specimen_nature,
            specimen_topography_code,
            imaging_data
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING id`,
          [
            patientId,
            specimen.specimenIdentifier,
            specimen.specimenCollectDateMonth ?? null,
            specimen.specimenCollectDateYear ?? null,
            specimen.specimenType ?? null,
            specimen.specimenNature ?? null,
            specimen.specimenTopographyCode ?? null,
            specimen.imaging ?? null,
          ],
        );
        const specimenId = specimenResult.rows[0].id;

        if (Array.isArray(specimen.biomarker)) {
          for (const biomarker of specimen.biomarker) {
            await client.query(
              `INSERT INTO biomarkers (
                specimen_id, biomarker_name, biomarker_value, biomarker_unit, test_method, test_date_year, test_date_month
              ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [
                specimenId,
                biomarker.biomarkerName ?? "",
                biomarker.biomarkerValue ?? null,
                biomarker.biomarkerUnit ?? null,
                biomarker.testMethod ?? null,
                biomarker.testDateYear ?? null,
                biomarker.testDateMonth ?? null,
              ],
            );
          }
        }
      }
    }

    if (Array.isArray(payload.mesureList)) {
      await client.query("DELETE FROM measures WHERE patient_id = $1", [
        patientId,
      ]);
      for (const measure of payload.mesureList) {
        await client.query(
          `INSERT INTO measures (
            patient_id, measure_type, measure_value, measure_unit, measure_date_year, measure_date_month
          ) VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            patientId,
            measure.measureType ?? null,
            measure.measureValue ?? null,
            measure.measureUnit ?? null,
            measure.measureDateYear ?? null,
            measure.measureDateMonth ?? null,
          ],
        );
      }
    }

    if (Array.isArray(payload.medication)) {
      await client.query("DELETE FROM medications WHERE patient_id = $1", [
        patientId,
      ]);
      for (const medication of payload.medication) {
        await client.query(
          `INSERT INTO medications (
            patient_id, medication_name, dosage, frequency, start_date_year, start_date_month, end_date_year, end_date_month, indication
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            patientId,
            medication.medicationName ?? "",
            medication.dosage ?? null,
            medication.frequency ?? null,
            medication.startDateYear ?? null,
            medication.startDateMonth ?? null,
            medication.endDateYear ?? null,
            medication.endDateMonth ?? null,
            medication.indication ?? null,
          ],
        );
      }
    }

    if (Array.isArray(payload.surgery)) {
      for (const surgery of payload.surgery) {
        await client.query(
          `INSERT INTO surgeries (
            patient_id, surgery_type, surgery_date_year, surgery_date_month, topography_code, procedure_details
          ) VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            patientId,
            surgery.surgeryType ?? null,
            surgery.surgeryDateYear ?? null,
            surgery.surgeryDateMonth ?? null,
            surgery.topographyCode ?? null,
            surgery.procedureDetails ?? null,
          ],
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ id: patientId });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      error: "Failed to import patient",
      details: error instanceof Error ? error.message : String(error),
    });
  } finally {
    client.release();
  }
};
