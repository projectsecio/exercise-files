import { pool } from "./db";

export async function getAttackNote(
  attackSlug: string,
  username: string
): Promise<{ body: string; updatedAt: string | null }> {
  const result = await pool.query(
    `SELECT body, updated_at FROM dashboard.attack_notes
     WHERE attack_slug = $1 AND username = $2`,
    [attackSlug, username]
  );
  if (result.rowCount === 0) {
    return { body: "", updatedAt: null };
  }
  const row = result.rows[0];
  return {
    body: row.body ?? "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export async function saveAttackNote(
  attackSlug: string,
  username: string,
  body: string
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO dashboard.attack_notes (attack_slug, username, body, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (attack_slug, username)
     DO UPDATE SET body = EXCLUDED.body, updated_at = now()
     RETURNING updated_at`,
    [attackSlug, username, body]
  );
  const updated = result.rows[0]?.updated_at;
  return updated ? new Date(updated).toISOString() : new Date().toISOString();
}
