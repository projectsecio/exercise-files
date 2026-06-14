import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execAsync = promisify(exec);

/**
 * Real-world scenario: a CTI platform stages incoming feed/sample files in an
 * ingestion directory, and operators verify each file's SHA-256 against the
 * vendor-published hash before importing it. The integrity check shells out to
 * the system `sha256sum` utility.
 */
export const INGEST_DIR = join(tmpdir(), "cti-ingest");

const SAMPLE_ARTIFACTS: Record<string, string> = {
  "feed-2026-01-05.json":
    JSON.stringify(
      {
        source: "projectx-collector",
        generated: "2026-01-05T08:00:00Z",
        indicators: 128,
      },
      null,
      2
    ) + "\n",
  "iocs-export.csv":
    "type,value,confidence\n" +
    "domain,bad-seabird.example,High\n" +
    "ipv4,203.0.113.7,Medium\n" +
    "sha256,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855,Low\n",
  "loader-sample.bin": "MZ\x90\x00\x03 simulated-pe-header for lab triage\n",
};

let seeded: Promise<void> | null = null;

/** Create the staged ingest files once; returns the available artifact names. */
export async function ensureArtifacts(): Promise<string[]> {
  if (!seeded) {
    seeded = (async () => {
      await mkdir(INGEST_DIR, { recursive: true });
      for (const [name, body] of Object.entries(SAMPLE_ARTIFACTS)) {
        await writeFile(join(INGEST_DIR, name), body);
      }
    })();
  }
  await seeded;
  return Object.keys(SAMPLE_ARTIFACTS);
}

/**
 * INTENTIONALLY VULNERABLE — the artifact name is interpolated straight into a
 * shell command string, which `exec` runs via `/bin/sh -c "…"`. Shell
 * metacharacters in the name (`;`, `&&`, `|`, `$()`) are honored, so a value
 * like `feed-2026-01-05.json; id` runs an arbitrary command (command injection).
 */
export async function unsafeHashArtifact(name: string): Promise<string> {
  await ensureArtifacts();
  const artifact = name.trim() || "feed-2026-01-05.json";
  const { stdout, stderr } = await execAsync(
    `sha256sum ${INGEST_DIR}/${artifact}`,
    { timeout: 10000, maxBuffer: 64 * 1024 }
  );
  return [stdout, stderr].filter(Boolean).join("\n").trim();
}
