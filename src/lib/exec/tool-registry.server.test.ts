import { describe, it, expect } from "vitest";
import { getExecutor, listExecutorIds } from "@/lib/exec/tool-registry.server";

describe("tool-registry.server", () => {
  describe("registry shape", () => {
    it("registers at least the core tool ids", () => {
      const ids = listExecutorIds();
      for (const required of ["sql.read", "kb.search"]) {
        expect(ids).toContain(required);
      }
    });

    it("returns null for unknown tool id (no fabrication path)", () => {
      expect(getExecutor("definitely.not.a.tool")).toBeNull();
    });
  });

  describe("sql.read input contract (anti-fabrication guarantees)", () => {
    const tool = getExecutor("sql.read");

    it("is registered", () => {
      expect(tool).not.toBeNull();
    });

    it("rejects table names outside the allowlist", () => {
      const parse = tool!.input.safeParse({ table: "users", columns: ["id"] });
      expect(parse.success).toBe(false);
    });

    it("rejects an empty columns array", () => {
      const parse = tool!.input.safeParse({ table: "sec_incidents", columns: [] });
      expect(parse.success).toBe(false);
    });

    it("rejects columns containing SQL injection tokens", () => {
      for (const bad of ["id;DROP TABLE", "1=1", "id--", "id/*x*/"]) {
        const parse = tool!.input.safeParse({ table: "sec_incidents", columns: [bad] });
        expect(parse.success).toBe(false);
      }
    });

    it("rejects limit > 500 and limit <= 0", () => {
      expect(tool!.input.safeParse({ table: "sec_incidents", limit: 501 }).success).toBe(false);
      expect(tool!.input.safeParse({ table: "sec_incidents", limit: 0 }).success).toBe(false);
      expect(tool!.input.safeParse({ table: "sec_incidents", limit: -1 }).success).toBe(false);
    });

    it("accepts a valid minimal call and defaults columns to '*' and limit to 50", () => {
      const parse = tool!.input.safeParse({ table: "sec_incidents" });
      expect(parse.success).toBe(true);
      if (parse.success) {
        const data = parse.data as { columns: string[]; limit: number };
        expect(data.columns).toEqual(["*"]);
        expect(data.limit).toBe(50);
      }
    });

    it("accepts a structured filter operator object", () => {
      const parse = tool!.input.safeParse({
        table: "sec_incidents",
        filters: { severity: { op: "in", value: ["high", "critical"] } },
      });
      expect(parse.success).toBe(true);
    });

    it("rejects unknown filter operator", () => {
      const parse = tool!.input.safeParse({
        table: "sec_incidents",
        filters: { severity: { op: "REGEXP", value: ".*" } },
      });
      expect(parse.success).toBe(false);
    });
  });
});
