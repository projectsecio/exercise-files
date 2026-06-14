import { pool } from "../db";

export type LabComment = {
  id: number;
  author: string;
  body: string;
  created_at: string;
};

export async function listComments(): Promise<LabComment[]> {
  const result = await pool.query(
    `SELECT id, author, body, created_at::text AS created_at
     FROM dashboard.lab_comments ORDER BY id DESC LIMIT 50`
  );
  return result.rows as LabComment[];
}

/** Format a shift note; case ref is digits-only before being wrapped in HTML. */
export function formatShiftNote(caseRef: string, body: string): string {
  const ref = caseRef.replace(/\D/g, "");
  if (!ref) return body;
  return `<b>Case #${ref}</b><br>${body}`;
}

export async function addComment(
  author: string,
  caseRef: string,
  body: string
): Promise<void> {
  const note = formatShiftNote(caseRef, body);
  await pool.query(
    `INSERT INTO dashboard.lab_comments (author, body) VALUES ($1, $2)`,
    [author, note]
  );
}
