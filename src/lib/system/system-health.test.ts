/**
 * System health — contract guard.
 *
 * The bug: the home header rendered a hard-coded «الأنظمة متصلة» badge that
 * said "connected" while the Supabase environment variables were absent and
 * every data feature was failing. The brief names it directly, and asks for a
 * test proving that a missing configuration can never produce `connected`.
 */
import { describe, expect, it } from "vitest";
import {
  type SystemHealth,
  deriveSystemHealth,
  hasSupabaseConfig,
  healthLabel,
  healthTone,
} from "./system-health";

const OK = { VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_ANON_KEY: "k" };

describe("supabase configuration detection", () => {
  it("accepts either key name — both have shipped", () => {
    expect(hasSupabaseConfig(OK)).toBe(true);
    expect(
      hasSupabaseConfig({
        VITE_SUPABASE_URL: "https://x.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "k",
      }),
    ).toBe(true);
  });

  it("treats present-but-empty as absent — the shape of a missing CI secret", () => {
    expect(hasSupabaseConfig({ VITE_SUPABASE_URL: "  ", VITE_SUPABASE_ANON_KEY: "k" })).toBe(false);
    expect(
      hasSupabaseConfig({ VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_ANON_KEY: "" }),
    ).toBe(false);
  });

  it("requires both halves", () => {
    expect(hasSupabaseConfig({ VITE_SUPABASE_URL: "https://x.supabase.co" })).toBe(false);
    expect(hasSupabaseConfig({ VITE_SUPABASE_ANON_KEY: "k" })).toBe(false);
    expect(hasSupabaseConfig({})).toBe(false);
  });
});

describe("missing config can NEVER report connected", () => {
  // This is the regression the brief asks for by name. Every combination of
  // downstream signals is tried; none may rescue an unconfigured deployment
  // into a green badge.
  const combos = [
    { probeOk: true, online: true },
    { probeOk: true, online: false },
    { probeOk: false, online: true },
    { probeOk: undefined, online: true },
    { probeOk: undefined, online: undefined },
  ] as const;

  for (const c of combos) {
    it(`stays misconfigured with probeOk=${String(c.probeOk)} online=${String(c.online)}`, () => {
      const state = deriveSystemHealth({ env: {}, ...c });
      expect(state).toBe<SystemHealth>("misconfigured");
      expect(state).not.toBe("connected");
      expect(healthTone(state)).not.toBe("positive");
    });
  }
});

describe("state derivation", () => {
  it("is `checking` before a probe answers — never optimistically connected", () => {
    // The original bug in one line: an unanswered probe must not read as good news.
    expect(deriveSystemHealth({ env: OK, online: true })).toBe("checking");
  });

  it("reports connected only on a positive probe", () => {
    expect(deriveSystemHealth({ env: OK, probeOk: true, online: true })).toBe("connected");
  });

  it("reports degraded when configured and reachable but the probe fails", () => {
    expect(deriveSystemHealth({ env: OK, probeOk: false, online: true })).toBe("degraded");
  });

  it("reports disconnected when the browser knows it is offline", () => {
    expect(deriveSystemHealth({ env: OK, probeOk: true, online: false })).toBe("disconnected");
  });

  it("ranks missing config above offline — different problem, different fix", () => {
    // Saying "offline" for a deploy-config fault sends someone to check the
    // network for a problem that is not there.
    expect(deriveSystemHealth({ env: {}, online: false })).toBe("misconfigured");
  });
});

describe("labels", () => {
  it("gives every state an Arabic and English label", () => {
    const states: SystemHealth[] = [
      "checking",
      "connected",
      "degraded",
      "disconnected",
      "misconfigured",
    ];
    for (const s of states) {
      expect(healthLabel(s, true).length).toBeGreaterThan(0);
      expect(healthLabel(s, false).length).toBeGreaterThan(0);
    }
  });

  it("never labels a non-connected state with the connected wording", () => {
    const connectedAr = healthLabel("connected", true);
    for (const s of ["checking", "degraded", "disconnected", "misconfigured"] as SystemHealth[]) {
      expect(healthLabel(s, true)).not.toBe(connectedAr);
    }
  });
});
