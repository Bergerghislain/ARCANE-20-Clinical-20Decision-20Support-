import { RequestHandler } from 'express';
import pool from '../db';

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
  const { name, age, gender, ipp } = req.body;
  const birthYear =
    typeof age === "number" && Number.isFinite(age)
      ? new Date().getFullYear() - age
      : null;
  const normalizedSex =
    typeof gender === "string" && gender.trim()
      ? gender.trim().toUpperCase()
      : null;
  const patientIpp =
    typeof ipp === "string" && ipp.trim()
      ? ipp.trim()
      : `ARC-${Date.now()}`;

  const result = await pool.query(
    `INSERT INTO patients (name, ipp, birth_date_year, sex)
     VALUES ($1, $2, $3, $4)
     RETURNING id_patient`,
    [name ?? null, patientIpp, birthYear, normalizedSex],
  );
  res.status(201).json({ id: result.rows[0].id_patient });
};
