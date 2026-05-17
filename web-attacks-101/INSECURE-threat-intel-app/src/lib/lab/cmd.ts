import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/** INTENTIONALLY VULNERABLE — shell metacharacters honored (command injection). */
export async function unsafePing(host: string): Promise<string> {
  const target = host.trim() || "127.0.0.1";
  const { stdout, stderr } = await execAsync(`ping -c 2 -W 2 ${target}`, {
    timeout: 10000,
    maxBuffer: 64 * 1024,
  });
  return (stdout || stderr || "").trim();
}
