import { pool } from "../db";

export type LabProduct = {
  id: number;
  name: string;
  description: string;
  price: string;
};

/** INTENTIONALLY VULNERABLE — string concatenation SQLi for WA101 lab only. */
export async function unsafeProductSearch(query: string): Promise<LabProduct[]> {
  const q = query.trim();
  const sql = `SELECT id, name, description, price::text AS price
    FROM dashboard.lab_products
    WHERE name ILIKE '%${q}%'
       OR description ILIKE '%${q}%'`;
  const result = await pool.query(sql);
  return result.rows as LabProduct[];
}

/** INTENTIONALLY VULNERABLE — login bypass via SQLi on lab-only accounts table query. */
export async function unsafeLabLogin(
  username: string,
  password: string
): Promise<{ username: string } | null> {
  const sql = `SELECT username FROM dashboard.lab_profiles
    WHERE username = '${username}' AND password = '${password}' LIMIT 1`;
  const result = await pool.query(sql);
  if (result.rowCount === 0) return null;
  return { username: result.rows[0].username as string };
}
