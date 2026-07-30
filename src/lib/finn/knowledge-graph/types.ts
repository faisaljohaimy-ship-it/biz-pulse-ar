/**
 * Phase 9.6 — Enterprise Knowledge Graph: types.
 *
 * Strictly additive. Server-side only. Coordination-only kernel.
 *
 * The graph stores typed Entities and Relationships. Every node and
 * every edge MUST cite at least one EvidenceRef; the graph never
 * fabricates. Confidence is derived, not invented. Contradictions are
 * surfaced, never silently reconciled.
 */

export type EntityKind =
  | "person"
  | "department"
  | "site"
  | "asset"
  | "incident"
  | "risk"
  | "inspection"
  | "task"
  | "report"
  | "policy"
  | "sop"
  | "decision"
  | "recommendation"
  | "system"
  | "connector"
  | "tool"
  | "agent"
  | "capability"
  | "objective"
  | "project"
  | "evidence";

export type RelationshipKind =
  | "owns"
  | "belongs_to"
  | "located_at"
  | "caused_by"
  | "related_to"
  | "depends_on"
  | "assigned_to"
  | "reported_by"
  | "approved_by"
  | "violates"
  | "mitigates"
  | "supports"
  | "contradicts"
  | "replaces"
  | "references"
  | "requires";

export type Confidence = "low" | "medium" | "high" | "unknown";
export type Severity = "info" | "notice" | "warn" | "error" | "critical";
export type Provenance = "asserted" | "ingested" | "resolved" | "inferred";
export type FreshnessState = "fresh" | "aging" | "stale" | "unknown";
export type ContradictionStatus = "none" | "flagged" | "reconciled";

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
    | "decision"
    | "memory"
    | "external";
  readonly source: string;
  readonly taken_at: string;
}

export interface EntityRecord {
  readonly id: string;
  readonly kind: EntityKind;
  readonly workspace_id: string;
  readonly canonical_name: string;
  readonly aliases: readonly string[];
  readonly attributes: Readonly<Record<string, string | number | boolean | null>>;
  readonly evidence: readonly EvidenceRef[];
  readonly provenance: Provenance;
  readonly confidence: Confidence;
  readonly freshness: FreshnessState;
  readonly created_at: string;
  readonly updated_at: string;
  readonly recurrence: number;
  readonly contradiction_status: ContradictionStatus;
  readonly contradiction_partner_ids: readonly string[];
  readonly merged_from: readonly string[];
}

export interface RelationshipRecord {
  readonly id: string;
  readonly kind: RelationshipKind;
  readonly workspace_id: string;
  readonly from_id: string;
  readonly to_id: string;
  readonly attributes: Readonly<Record<string, string | number | boolean | null>>;
  readonly evidence: readonly EvidenceRef[];
  readonly provenance: Provenance;
  readonly confidence: Confidence;
  readonly freshness: FreshnessState;
  readonly created_at: string;
  readonly updated_at: string;
  readonly recurrence: number;
  readonly contradiction_status: ContradictionStatus;
  readonly contradiction_partner_ids: readonly string[];
}

export interface OntologyEntityDescriptor {
  readonly kind: EntityKind;
  readonly label: string;
  readonly required_attributes: readonly string[];
  readonly optional_attributes: readonly string[];
}

export interface OntologyRelationshipDescriptor {
  readonly kind: RelationshipKind;
  readonly label: string;
  readonly inverse?: RelationshipKind;
  readonly symmetric: boolean;
  readonly transitive: boolean;
  readonly allowed_from: readonly EntityKind[];
  readonly allowed_to: readonly EntityKind[];
}

export interface Ontology {
  readonly entities: Readonly<Record<EntityKind, OntologyEntityDescriptor>>;
  readonly relationships: Readonly<Record<RelationshipKind, OntologyRelationshipDescriptor>>;
}

export interface RawIngestPayload {
  readonly workspace_id: string;
  readonly source: string;
  readonly taken_at: string;
  readonly evidence: readonly EvidenceRef[];
  readonly entities: readonly RawEntityAssertion[];
  readonly relationships: readonly RawRelationshipAssertion[];
}

export interface RawEntityAssertion {
  readonly kind: EntityKind;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly attributes?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface RawRelationshipAssertion {
  readonly kind: RelationshipKind;
  readonly from_name: string;
  readonly from_kind: EntityKind;
  readonly to_name: string;
  readonly to_kind: EntityKind;
  readonly attributes?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface IngestionReport {
  readonly id: string;
  readonly created_at: string;
  readonly source: string;
  readonly ingested_entities: readonly string[];
  readonly ingested_relationships: readonly string[];
  readonly rejected: readonly { readonly reason: string; readonly item: string }[];
}

export interface GraphQuery {
  readonly workspace_id: string;
  readonly entity_kinds?: readonly EntityKind[];
  readonly relationship_kinds?: readonly RelationshipKind[];
  readonly text?: string;
  readonly min_confidence?: Confidence;
  readonly include_stale?: boolean;
  readonly limit?: number;
}

export interface RankedEntity {
  readonly record: EntityRecord;
  readonly relevance: number;
  readonly freshness_score: number;
  readonly confidence_score: number;
  readonly recurrence_score: number;
  readonly composite: number;
}

export interface QueryReport {
  readonly id: string;
  readonly created_at: string;
  readonly query: GraphQuery;
  readonly entities: readonly RankedEntity[];
  readonly relationships: readonly RelationshipRecord[];
  readonly uncertainty: Confidence;
  readonly explanation: string;
}

export interface TraversalNode {
  readonly entity: EntityRecord;
  readonly depth: number;
  readonly path: readonly string[];
}

export interface TraversalReport {
  readonly id: string;
  readonly created_at: string;
  readonly root_id: string;
  readonly max_depth: number;
  readonly visited: readonly TraversalNode[];
  readonly edges: readonly RelationshipRecord[];
}

export interface ContradictionReport {
  readonly id: string;
  readonly created_at: string;
  readonly subject: "entity" | "relationship";
  readonly member_ids: readonly string[];
  readonly reason: string;
  readonly status: ContradictionStatus;
}

export interface ReasoningInference {
  readonly id: string;
  readonly created_at: string;
  readonly kind: RelationshipKind;
  readonly from_id: string;
  readonly to_id: string;
  readonly derived_from: readonly string[]; // relationship ids that produced this inference
  readonly evidence: readonly EvidenceRef[];
  readonly confidence: Confidence;
  readonly marked_inferred: true;
}

export interface VerificationIssue {
  readonly code:
    | "missing_evidence"
    | "duplicate_id"
    | "dangling_edge"
    | "ontology_violation"
    | "fabricated_confidence"
    | "unmarked_inference"
    | "circular_link"
    | "contradiction_silent_resolution";
  readonly detail: string;
  readonly subject_id?: string;
}

export interface VerificationReport {
  readonly id: string;
  readonly created_at: string;
  readonly ok: boolean;
  readonly issues: readonly VerificationIssue[];
  readonly checked_entities: number;
  readonly checked_relationships: number;
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
  readonly actor: "knowledge-graph";
  readonly action: string;
  readonly subject_id: string;
  readonly evidence_ids: readonly string[];
}
