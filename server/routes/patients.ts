import { RequestHandler } from "express";
import pool from "../db";

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
  const normalizedSex =
    typeof gender === "string" && gender.trim()
      ? gender.trim().toUpperCase()
      : null;
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
      value:
        typeof gender === "string" && gender.trim()
          ? gender.trim().toUpperCase()
          : null,
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
