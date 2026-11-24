import { describe, expect, it, vi } from "vitest";
import { readMessageResultEvidence, readResultEvidence } from "./read-result-evidence";

const first = "3d78c00d-26e4-4b5c-a518-5bed1d4aab80";
const second = "3952d4fa-2678-43ed-bcc3-4f21f061a3f3";

describe("existing read-result evidence", () => {
  it("keeps sample size and a mismatching reported count separate from unknown totals and scope", () => {
    const view = readResultEvidence("sec_list_incidents", {
      ok: true,
      incidents: [
        { id: first, ref: "INC-001", reported_at: "2026-11-24T00:00:00Z" },
        { id: second, ref: "INC-002", reported_at: "2026-11-23T00:00:00Z" },
      ],
      count: 150,
      total: 999,
      org_id: first,
      region: "western",
      updated_at: "2026-11-24T10:00:00Z",
    });
    expect(view?.returnedCount).toBe(2);
    expect(view?.reportedSampleCount).toBe(150);
    expect(view?.countMismatch).toBe(true);
    expect(view?.totalCount).toBeNull();
    expect(view?.organization).toBeNull();
    expect(view?.region).toBeNull();
    expect(view?.sourceUpdatedAt).toBeNull();
    expect(view?.queryWindow).toBeNull();
    expect(view?.sampleRecordTimes).toEqual({
      from: "2026-11-23T00:00:00.000Z",
      to: "2026-11-24T00:00:00.000Z",
    });
  });

  it("preserves actual zero but never turns failed, missing or malformed rows into zero", () => {
    const empty = readResultEvidence("sec_list_permits", { ok: true, permits: [], count: 0 });
    expect(empty?.returnedCount).toBe(0);
    expect(empty?.reportedSampleCount).toBe(0);
    expect(empty?.totalCount).toBeNull();
    for (const output of [
      { ok: false, permits: [] },
      { ok: true },
      { ok: true, permits: {} },
      null,
    ])
      expect(readResultEvidence("sec_list_permits", output)?.returnedCount).toBeNull();
  });

  it("only retains bounded technical record references and never copies private rows or URLs", () => {
    const view = readResultEvidence("sec_list_incidents", {
      ok: true,
      incidents: [
        { id: first, ref: "INC-001", full_name: "PRIVATE NAME", notes: "PRIVATE NOTES" },
        { id: second, ref: "sk-proj-PRIVATESECRET", email: "PRIVATE@EXAMPLE.ORG" },
        { id: "https://attacker.example", ref: "https://attacker.example" },
        { id: first, ref: "INC-duplicate" },
      ],
    });
    expect(view?.records).toEqual([
      { id: first, reference: "INC-001" },
      { id: second, reference: null },
    ]);
    expect(JSON.stringify(view)).not.toMatch(/PRIVATE|attacker/);
    expect(view?.route).toBe("/sec/incidents");
  });

  it("does not claim a complete sample time range from missing, invalid or truncated timestamps", () => {
    for (const time of [undefined, "2026-02-30T00:00:00Z", "yesterday"])
      expect(
        readResultEvidence("sec_list_incidents", {
          ok: true,
          incidents: [{ id: first, reported_at: time }],
        })?.sampleRecordTimes,
      ).toBeNull();
    const rows = Array.from({ length: 100 }, () => ({ reported_at: "2026-11-24T00:00:00Z" }));
    const view = readResultEvidence("sec_list_incidents", { ok: true, incidents: rows });
    expect(view?.returnedCount).toBe(100);
    expect(view?.bounded).toBe(true);
    expect(view?.sampleRecordTimes).toBeNull();
    expect(view?.totalCount).toBeNull();
  });

  it("never invokes an accessor and ignores unregistered or mutating tools", () => {
    const getter = vi.fn(() => [{ id: first }]);
    const output = Object.defineProperty({ ok: true }, "incidents", { get: getter });
    expect(readResultEvidence("sec_list_incidents", output)?.status).toBe("invalid");
    expect(getter).not.toHaveBeenCalled();
    expect(readResultEvidence("sec_create_incident", { ok: true, incidents: [] })).toBeNull();
    expect(readResultEvidence("__proto__", output)).toBeNull();
    expect(readResultEvidence("ptw_active_permits", { ok: true, permits: [] })).toBeNull();
  });

  it("reads completed SDK outputs only and marks transport truncation instead of executing input", () => {
    const message = {
      parts: [
        { type: "tool-sec_list_incidents", state: "input-available", input: { execute: true } },
        { type: "tool-sec_create_incident", state: "output-available", output: { ok: true } },
        {
          type: "dynamic-tool",
          toolName: "sec_list_permits",
          state: "output-available",
          output: { ok: true, permits: [], count: 0 },
        },
      ],
    };
    expect(readMessageResultEvidence(message)).toHaveLength(1);
    expect(readMessageResultEvidence(message)[0].returnedCount).toBe(0);
    expect(
      readMessageResultEvidence({ parts: [...message.parts, ...Array(40).fill(null)] })[0].bounded,
    ).toBe(true);
  });
});
