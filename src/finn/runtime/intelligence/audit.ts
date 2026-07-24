/**
 * Executive Audit Engine — tamper-evident audit for the intelligence layer.
 *
 * Composes the Phase-4 hash-chained AuditLayer (imported, never modified):
 * every drafted decision, issued recommendation, captured snapshot and
 * evaluated insight leaves a verifiable trail.
 */
import { AuditLayer, type AuditEntry } from "../orchestration/policy";
import type { Clock } from "./types";

export class ExecutiveAuditEngine {
  private readonly layer: AuditLayer;

  constructor(clock: Clock, limit = 2000) {
    this.layer = new AuditLayer(clock, limit);
  }

  record(category: string, action: string, detail: string): AuditEntry {
    return this.layer.record(category, action, detail);
  }

  trail(category: string): readonly AuditEntry[] {
    return this.layer.trail(category);
  }

  all(): readonly AuditEntry[] {
    return this.layer.all();
  }

  /** Hash-chain verification — any tampering breaks it. */
  verify(): boolean {
    return this.layer.verify();
  }
}
