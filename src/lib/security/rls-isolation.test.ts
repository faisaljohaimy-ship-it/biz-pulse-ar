import { describe, expect, it, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * REAL cross-tenant RLS isolation test (production-readiness §P1-1).
 *
 * Proves that a user in organisation A can neither READ nor WRITE another
 * organisation's rows on every org-scoped table — RLS being the true line of
 * defence (UI guards are cosmetic).
 *
 * This is a live-database integration test. It runs only when the environment
 * provides a Supabase URL + two users from two DIFFERENT organisations, so CI
 * (which provisions those) executes it and local/unit runs skip it cleanly.
 * See RLS_TEST_REPORT.md for the required variables and how to provision them.
 */
const URL = process.env.RLS_TEST_SUPABASE_URL;
const ANON = process.env.RLS_TEST_SUPABASE_ANON_KEY;
const A_EMAIL = process.env.RLS_TEST_ORG_A_EMAIL;
const A_PASS = process.env.RLS_TEST_ORG_A_PASSWORD;
const A_ORG = process.env.RLS_TEST_ORG_A_ID;
const B_EMAIL = process.env.RLS_TEST_ORG_B_EMAIL;
const B_PASS = process.env.RLS_TEST_ORG_B_PASSWORD;
const B_ORG = process.env.RLS_TEST_ORG_B_ID;

const LIVE = Boolean(URL && ANON && A_EMAIL && A_PASS && A_ORG && B_EMAIL && B_PASS && B_ORG);

// Org-scoped tables carrying operational / PII data. Override with a
// comma-separated RLS_TEST_TABLES to match the live schema exactly.
const TABLES = (
  process.env.RLS_TEST_TABLES ??
  [
    "aria_documents",
    "aria_document_chunks",
    "aria_decisions",
    "aria_reports",
    "aria_memory",
    "aria_knowledge",
    "aria_outbound_messages",
    "aria_interactions",
  ].join(",")
)
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

describe.skipIf(!LIVE)("RLS — cross-tenant isolation (live DB)", () => {
  let orgA: SupabaseClient;
  let orgB: SupabaseClient;

  beforeAll(async () => {
    orgA = await signIn(A_EMAIL!, A_PASS!);
    orgB = await signIn(B_EMAIL!, B_PASS!);
  });

  for (const table of TABLES) {
    it(`${table}: org A cannot READ org B's rows`, async () => {
      // Ask org A explicitly for org B's rows — RLS must return zero.
      const { data, error } = await orgA.from(table).select("*").eq("org_id", B_ORG!).limit(1);
      // A missing table/column is a config error, not a pass — surface it.
      expect(error, `read blocked or config error on ${table}: ${error?.message}`).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it(`${table}: org B cannot READ org A's rows`, async () => {
      const { data, error } = await orgB.from(table).select("*").eq("org_id", A_ORG!).limit(1);
      expect(error, `read blocked or config error on ${table}: ${error?.message}`).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it(`${table}: org A cannot WRITE a row into org B`, async () => {
      // RLS WITH CHECK must reject an insert stamped with another org's id.
      const { error } = await orgA.from(table).insert({ org_id: B_ORG! });
      expect(error, `cross-org insert into ${table} was NOT rejected`).not.toBeNull();
    });
  }
});

// A guard that always runs — documents WHY the suite skipped, so a green run
// with zero RLS assertions can never be mistaken for "RLS verified".
describe("RLS test harness", () => {
  it(LIVE ? "is running against a live database" : "is skipped (no live DB env provided)", () => {
    if (!LIVE) {
      console.info(
        "[RLS] skipped — set RLS_TEST_SUPABASE_URL + two-org credentials to run (see RLS_TEST_REPORT.md).",
      );
    }
    expect(TABLES.length).toBeGreaterThan(0);
  });
});
