import { existsSync } from "node:fs";
import { join } from "node:path";

/** Directory containing WA101 attack markdown guides (see docs/docs/wa101/attacks). */
export function attacksGuidesDir(): string {
  const fromEnv =
    (import.meta.env.ATTACKS_GUIDES_DIR as string | undefined) ??
    (typeof process !== "undefined" ? process.env.ATTACKS_GUIDES_DIR : undefined);

  if (fromEnv) return fromEnv;

  // Local dev: monorepo path from exercise-files/web-attacks-101/INSECURE-threat-intel-app
  const monorepo = join(process.cwd(), "../../../../docs/docs/wa101/attacks");
  if (existsSync(monorepo)) return monorepo;

  return join(process.cwd(), "attack-guides");
}

export function attackGuidePath(guideFile: string): string {
  return join(attacksGuidesDir(), guideFile);
}

/** Remove MkDocs YAML frontmatter before rendering in the app. */
export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 3).trimStart();
}
