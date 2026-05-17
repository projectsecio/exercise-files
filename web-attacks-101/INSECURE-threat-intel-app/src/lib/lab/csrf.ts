import { pool } from "../db";

export async function getProfile(username: string): Promise<{
  username: string;
  email: string;
  display_name: string;
} | null> {
  const result = await pool.query(
    `SELECT username, email, display_name FROM dashboard.lab_profiles WHERE username = $1`,
    [username]
  );
  if (result.rowCount === 0) return null;
  return result.rows[0] as { username: string; email: string; display_name: string };
}

/** INTENTIONALLY VULNERABLE — state change with session cookie only (no CSRF token). */
export async function updateEmail(username: string, email: string): Promise<void> {
  await pool.query(
    `UPDATE dashboard.lab_profiles SET email = $2 WHERE username = $1`,
    [username, email]
  );
}
