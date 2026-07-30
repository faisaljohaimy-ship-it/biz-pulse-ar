/**
 * Phase 9.5 — Long-Term Autonomous Memory: types.
 *
 * Strictly additive. Server-side only. Coordination-only kernel.
 *
 * The Long-Term Memory (LTM) layer stores evidence-linked memory
 * records with typed classification, confidence, provenance, and
 * decay metadata. It never fabricates recall — every returned record
 * MUST carry at least one EvidenceRef. Unknown remains UNKNOWN.
 */

export type MemoryKind = "episodic" | "semantic" | "procedural" | "decision" | "experience";

export type Confidence = "low" | "medium" | "high" | "unknown";
export type Sensitivity = "public" | "internal" | "restricted" | "secret";
export type Severity = "info" | "notice" | "warn" | "error" | "critical";
export type ConflictStatus = "none" | "flagged" | "reconciled" | "unresolved";
export type MemoryStatus = "active" | "compressed" | "decayed" | "forgotten" | "conflict";

export interface EvidenceRef {
  readonly id: string;
  readonly kind:
    | "execution"
    | "telemetry"
    | "audit"
    | "benchmark"
    | "pattern"
    | "experience"
    | "reflection"
    | "table"
    | "document"
    | "conversation"
    | "workflow"
    | "decision";
  readonly source: string;
  readonly taken_at: string;
}

export interface MemoryRecord {
  readonly id: string;
  readonly kind: MemoryKind;
  readonly workspace_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  readonly evidence: readonly EvidenceRef[];
  readonly confidence: Confidence;
  readonly sensitivity: Sensitivity;
  readonly recurrence: number; // how many times this record has been reinforced (>=1)
  readonly business_impact: Severity;
  readonly source_quality: number; // 0..1 or -1 when unknown
  readonly last_accessed_at: string;
  readonly access_count: number;
  readonly compressed_from?: readonly string[];
  readonly conflict_status: ConflictStatus;
  readonly conflict_partner_ids: readonly string[];
  readonly status: MemoryStatus;
}

export interface RetrievalQuery {
  readonly workspace_id: string;
  readonly text: string;
  readonly kinds?: readonly MemoryKind[];
  readonly tags?: readonly string[];
  readonly min_confidence?: Confidence;
  readonly max_sensitivity?: Sensitivity;
  readonly limit?: number;
}

export interface RankedMemory {
  readonly record: MemoryRecord;
  readonly relevance: number; // 0..1
  readonly freshness: number; // 0..1
  readonly confidence_score: number; // 0..1 or -1
  readonly source_quality: number; // 0..1 or -1
  readonly recurrence_score: number; // 0..1
  readonly impact_score: number; // 0..1
  readonly composite: number; // 0..1 or -1 when unknown
}

export interface RetrievalReport {
  readonly id: string;
  readonly created_at: string;
  readonly query: RetrievalQuery;
  readonly results: readonly RankedMemory[];
  readonly uncertainty: Confidence;
  readonly explanation: string;
}

export interface ConsolidationReport {
  readonly id: string;
  readonly created_at: string;
  readonly merged: readonly { readonly kept_id: string; readonly merged_ids: readonly string[] }[];
  readonly compressed: readonly {
    readonly new_id: string;
    readonly source_ids: readonly string[];
  }[];
  readonly conflicts: readonly ConflictReport[];
}

export interface ConflictReport {
  readonly id: string;
  readonly created_at: string;
  readonly member_ids: readonly string[];
  readonly reason: string;
  readonly status: ConflictStatus;
}

export interface DecayReport {
  readonly id: string;
  readonly created_at: string;
  readonly evaluated: number;
  readonly decayed_ids: readonly string[];
  readonly compressed_ids: readonly string[];
}

export interface ForgettingReport {
  readonly id: string;
  readonly created_at: string;
  readonly forgotten_ids: readonly string[];
  readonly reason: "policy" | "consent_revoked" | "retention_expired";
  readonly evidence_preserved: boolean;
}

export interface PrivacyDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly redactions: readonly string[];
}

export interface VerificationIssue {
  readonly code:
    | "missing_evidence"
    | "fabricated_recall"
    | "duplicate_id"
    | "sensitivity_violation"
    | "conflict_silent_resolution"
    | "circular_link"
    | "invalid_status_transition";
  readonly detail: string;
  readonly subject_id?: string;
}

export interface VerificationReport {
  readonly id: string;
  readonly created_at: string;
  readonly ok: boolean;
  readonly issues: readonly VerificationIssue[];
  readonly checked_count: number;
}

export interface MetricPoint {
  readonly ts: string;
  readonly key: string;
  readonly value: number;
}

export interface TelemetryEvent {
  readonly id: string;
  readonly ts: string;
  readonly kind: string;
  readonly severity: Severity;
  readonly detail: string;
}

export interface AuditEntry {
  readonly id: string;
  readonly ts: string;
  readonly actor: "long-term-memory";
  readonly action: string;
  readonly subject_id: string;
  readonly evidence_ids: readonly string[];
}
