import { describe, expect, it } from "vitest";
import { buildReferenceSimulationContext } from "./reference-simulation-context.server";

describe("SADEED reference simulation context", () => {
  it("is explicitly simulated and covers all four industrial-security regions", () => {
    const snapshot = buildReferenceSimulationContext(Date.parse("2026-08-01T12:00:00Z"));
    expect(snapshot.dataAvailable).toBe(true);
    expect(snapshot.contextBlock).toContain("REFERENCE_SIMULATION_ONLY");
    expect(snapshot.contextBlock).toContain("بيانات محاكاة مرجعية");
    for (const region of ["الوسطى", "الغربية", "الشرقية", "الجنوبية"]) {
      expect(snapshot.contextBlock).toContain(region);
    }
    expect(snapshot.contextBlock).toContain("متوسط الامتثال عبر المناطق: 95%");
    expect(snapshot.contextBlock).not.toContain("full_name");
  });
});
