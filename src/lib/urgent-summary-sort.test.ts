import { describe, expect, it } from "vitest";
import { compareUrgentTasks } from "./urgent-summary-sort";

describe("urgent-summary critical-task ordering", () => {
  it("places valid deadlines before malformed and missing dates at equal priority", () => {
    const rows = [
      { id: "invalid", priority: "عاجل جدًا", due_at: "2026-11-08junk" },
      { id: "missing", priority: "عاجل جدًا", due_at: null },
      { id: "later", priority: "عاجل جدًا", due_at: "2026-11-08T09:00:00Z" },
      { id: "earlier", priority: "عاجل جدًا", due_at: "2026-11-08T06:00:00Z" },
    ];
    expect(
      rows
        .sort(compareUrgentTasks)
        .slice(0, 3)
        .map((r) => r.id),
    ).toEqual(["earlier", "later", "invalid"]);
  });

  it("does not discard priority ordering when the highest-priority due date is invalid", () => {
    const rows = [
      { id: "standard", priority: "عاجل", due_at: "2026-11-01T00:00:00Z" },
      { id: "critical", priority: "عاجل جدًا", due_at: "invalid" },
    ];
    expect(rows.sort(compareUrgentTasks).map((r) => r.id)).toEqual(["critical", "standard"]);
  });

  it("returns a finite comparator value for two missing or invalid dates", () => {
    const first = { priority: "عاجل", due_at: null };
    const second = { priority: "عاجل", due_at: "not-a-date" };
    expect(compareUrgentTasks(first, second)).toBe(0);
    expect(compareUrgentTasks(second, first)).toBe(0);
  });

  it("rejects calendar overflow while keeping valid UTC and offset timestamps", () => {
    const future = { priority: "عاجل", due_at: "2026-11-08T09:00:00+03:00" };
    const earlier = { priority: "عاجل", due_at: "2026-11-08T05:00:00Z" };
    const overflow = { priority: "عاجل", due_at: "2026-02-30" };
    expect([future, overflow, earlier].sort(compareUrgentTasks)).toEqual([
      earlier,
      future,
      overflow,
    ]);
  });

  it("orders offset-free and explicit-zone deadlines consistently in Riyadh and UTC", () => {
    const previous = process.env.TZ;
    try {
      const rows = [
        { id: "offset-free", priority: "عاجل", due_at: "2026-11-11T10:00:00" },
        { id: "with-zone", priority: "عاجل", due_at: "2026-11-11T09:30:00Z" },
        { id: "with-offset", priority: "عاجل", due_at: "2026-11-11T10:00:00+03:00" },
      ];
      for (const timezone of ["UTC", "Asia/Riyadh"]) {
        process.env.TZ = timezone;
        expect([...rows].sort(compareUrgentTasks).map((row) => row.id)).toEqual([
          "with-offset",
          "with-zone",
          "offset-free",
        ]);
      }
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
});
