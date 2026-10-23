/**
 * vitest globalSetup for the integration tier — FAILS LOUDLY when the stack
 * is not up. There is no mocked fallback: a green integration run must mean
 * real Postgres + PostgREST answered.
 */
import { loadIntegrationEnv } from "./harness/env";

export default async function setup(): Promise<void> {
  const env = loadIntegrationEnv();
  const url = env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL missing from the integration env file");
  // Never against anything but the local throwaway stack — a non-loopback host
  // here would mean production keys could be used by a destructive suite.
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "[::1]" && host !== "::1") {
    throw new Error(
      `Refusing to run the integration tier against non-local host "${host}" (SUPABASE_URL).`,
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    if (!res.ok) throw new Error(`gateway at ${url} answered ${res.status}`);
  } catch (err) {
    throw new Error(
      `Integration gateway at ${url} is not reachable (${err instanceof Error ? err.message : String(err)}). ` +
        "Run `npm run integration:up` and retry.",
    );
  } finally {
    clearTimeout(timer);
  }
}
