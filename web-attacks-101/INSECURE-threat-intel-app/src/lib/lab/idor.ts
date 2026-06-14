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

/**
 * The current user's own notes, shown in the "Recent" sidebar (newest first).
 * The sensitive IDOR target intentionally never appears here — it is only
 * reachable by editing the `?id=` reference directly.
 */
export async function listUserDocuments(
  username: string
): Promise<{ id: number; title: string }[]> {
  const result = await pool.query(
    `SELECT id, title
     FROM dashboard.lab_documents
     WHERE owner_username = $1 AND confidential = false
     ORDER BY id DESC
     LIMIT 20`,
    [username]
  );
  return result.rows as { id: number; title: string }[];
}

/** Create a new note owned by the current user (always non-sensitive). */
export async function createDocument(
  owner: string,
  title: string,
  body: string
): Promise<LabDocument> {
  const result = await pool.query(
    `INSERT INTO dashboard.lab_documents (owner_username, title, body, confidential)
     VALUES ($1, $2, $3, false)
     RETURNING id, owner_username, title, body, confidential`,
    [owner, title, body]
  );
  return result.rows[0] as LabDocument;
}
