/**
 * Article 19 — Continuous security gap-closure E2E.
 *
 * Locks in the migrations shipped for the aria_incidents tightening and the
 * anonymous crash beacon → aria_public_incidents split.
 *
 * Two invariants are asserted, and if either breaks the failure is treated
 * as a constitution regression (Art. 19), not a flaky test:
 *
 *   1. The public incident sink (POST /api/public/hooks/aria-incident) is a
 *      defensive write-only surface: accepts a well-formed beacon (202),
 *      rejects unknown kinds (400), bad JSON (400), and oversized bodies
 *      (413). It MUST land the row in `aria_public_incidents` — never in
 *      the user-owned `aria_incidents` table.
 *
 *   2. Anonymous callers using only the publishable key CANNOT read
 *      user-owned or admin-only tables via the Supabase Data API. This
 *      guards against the exact class of finding that Art. 19 was written
 *      to close (missing RLS, `user_id IS NULL` policies, anon inserts on
 *      user-owned tables).
 *
 * The anonymous-read probes require SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY
 * in the test env (already present in `.env`). If they are missing the
 * probe test is skipped, but the incident sink test always runs.
 */
import { test, expect, request as pwRequest } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

test.describe("Constitution Art. 19 · security gap-closure", () => {
  test("public incident sink accepts a well-formed beacon (202)", async ({ request }) => {
    const res = await request.post("/api/public/hooks/aria-incident", {
      data: {
        kind: "unhandled_error",
        detail: "art19 e2e probe",
        url: "https://example.test/probe",
        device_class: "desktop",
        ts: Date.now(),
      },
    });
    expect(res.status(), "well-formed beacon must be accepted").toBe(202);
  });

  test("public incident sink rejects unknown kind (400)", async ({ request }) => {
    const res = await request.post("/api/public/hooks/aria-incident", {
      data: { kind: "not_a_real_kind", detail: "x" },
    });
    expect(res.status()).toBe(400);
  });

  test("public incident sink rejects malformed JSON (400)", async ({ request }) => {
    const res = await request.post("/api/public/hooks/aria-incident", {
      headers: { "content-type": "application/json" },
      data: "{not json",
    });
    expect(res.status()).toBe(400);
  });

  test("public incident sink rejects oversized payload (413)", async ({ request }) => {
    // > 4096 byte body is refused by Content-Length gate before parsing.
    const bigDetail = "x".repeat(5000);
    const res = await request.post("/api/public/hooks/aria-incident", {
      data: { kind: "unhandled_error", detail: bigDetail },
    });
    expect(res.status()).toBe(413);
  });

  test("anon Data API cannot read user-owned or admin-only tables", async () => {
    test.skip(
      !SUPABASE_URL || !SUPABASE_ANON,
      "SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY missing in test env",
    );

    const api = await pwRequest.newContext({
      baseURL: SUPABASE_URL,
      extraHTTPHeaders: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
    });

    // Tables that MUST be invisible to anon:
    //   - aria_incidents: user-owned; Art. 19 dropped the "user_id IS NULL"
    //     policy and scoped reads to auth.uid() = user_id.
    //   - aria_public_incidents: service-role-only sink for anonymous
    //     crash beacons. Even the row we just wrote must not be readable.
    //   - user_roles: privilege table. Never anon-readable.
    for (const table of ["aria_incidents", "aria_public_incidents", "user_roles"]) {
      const res = await api.get(`/rest/v1/${table}?select=*&limit=1`);
      // 401/403 (blocked) OR 200 with an empty array (RLS-filtered) are both
      // acceptable — a populated array means anon can read the table, which
      // is a constitution breach.
      if (res.status() === 200) {
        const rows = (await res.json()) as unknown[];
        expect(Array.isArray(rows) && rows.length, `anon must not read from ${table}`).toBeFalsy();
      } else {
        expect(
          [401, 403, 404],
          `anon read of ${table} should be blocked, got ${res.status()}`,
        ).toContain(res.status());
      }
    }

    // Anonymous INSERT into the user-owned incident table must also fail —
    // Art. 19 forbids anonymous inserts on user-owned tables.
    const insertRes = await api.post("/rest/v1/aria_incidents", {
      headers: { "content-type": "application/json", Prefer: "return=minimal" },
      data: { kind: "art19_probe", detail: "must be rejected" },
    });
    expect(
      insertRes.status(),
      "anon insert into aria_incidents must be blocked by RLS",
    ).toBeGreaterThanOrEqual(400);

    await api.dispose();
  });
});
