import { pool } from "../db";

export type LabDocument = {
  id: number;
  owner_username: string;
  title: string;
  body: string;
  confidential: boolean;
};

/** INTENTIONALLY VULNERABLE — no authorization check (IDOR). */
export async function getDocumentById(id: number): Promise<LabDocument | null> {
  const result = await pool.query(
    `SELECT id, owner_username, title, body, confidential
     FROM dashboard.lab_documents WHERE id = $1`,
    [id]
  );
  if (result.rowCount === 0) return null;
  return result.rows[0] as LabDocument;
}

export async function listDocumentIds(): Promise<{ id: number; title: string }[]> {
  const result = await pool.query(
    `SELECT id, title FROM dashboard.lab_documents ORDER BY id`
  );
  return result.rows as { id: number; title: string }[];
}
