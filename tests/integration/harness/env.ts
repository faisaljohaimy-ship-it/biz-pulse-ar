/**
 * Loads the env file written by `tests/integration/stack.sh up` into
 * `process.env` (without overriding values already set, so CI can inject
 * its own). Shared by the vitest globalSetup, the setup file and the
 * harness helpers — one parser, one source of truth.
 */
import fs from "node:fs";
import path from "node:path";

export const INTEGRATION_DIR = path.resolve(__dirname, "..");
export const DEFAULT_ENV_FILE = path.join(INTEGRATION_DIR, ".env.integration");

export function envFilePath(): string {
  return process.env.INTEGRATION_ENV_FILE || DEFAULT_ENV_FILE;
}

export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

export function loadIntegrationEnv(): Record<string, string> {
  const file = envFilePath();
  if (!fs.existsSync(file)) {
    throw new Error(
      [
        `Integration stack env file not found: ${file}`,
        "Run `npm run integration:up` (tests/integration/stack.sh up) first —",
        "the integration tier never runs against a mocked database.",
      ].join("\n"),
    );
  }
  const parsed = parseEnvFile(fs.readFileSync(file, "utf8"));
  for (const [k, v] of Object.entries(parsed)) {
    // The stack file WINS for every variable that decides where the tests
    // talk and with which keys: a service-role key exported in the developer's
    // shell must never be used by this tier. Everything else keeps "env first".
    const decidesTarget = /^(SUPABASE_|INTEGRATION_)/.test(k);
    if (decidesTarget || process.env[k] === undefined) process.env[k] = v;
  }
  return parsed;
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set — is the integration stack up?`);
  return v;
}
