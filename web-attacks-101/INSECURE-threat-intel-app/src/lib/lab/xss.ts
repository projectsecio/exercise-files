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

export async function addComment(author: string, body: string): Promise<void> {
  await pool.query(
    `INSERT INTO dashboard.lab_comments (author, body) VALUES ($1, $2)`,
    [author, body]
  );
}
