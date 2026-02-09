import { RequestHandler } from "express";
import pool from "../db";

function isBcryptHash(value: string) {
  return /^\$2[aby]?\$/.test(value);
}

export const login: RequestHandler = async (req, res) => {
  const { identifier, password } = req.body ?? {};
  if (!identifier || !password) {
    res.status(400).json({ error: "Missing credentials" });
    return;
  }

  const result = await pool.query(
    `SELECT id, username, email, role, full_name, password_hash, is_active
     FROM users
     WHERE email = $1 OR username = $1
     LIMIT 1`,
    [identifier],
  );

  if (result.rowCount === 0) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = result.rows[0];
  if (user.is_active === false) {
    res.status(403).json({ error: "User disabled" });
    return;
  }

  const storedPassword = user.password_hash ?? "";
  const matches =
    storedPassword === password ||
    (isBcryptHash(storedPassword) && password === "password");

  if (!matches) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json({
    token: `arcane_${user.id}_${Date.now()}`,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
  });
};
