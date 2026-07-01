/**
 * Ontology.
 *
 * Defines the allowed entity kinds and the relationship type-system
 * (symmetry, inverse, transitivity, source/target constraints). The
 * ontology is frozen at load time — no runtime mutation.
 */

import type {
  EntityKind,
  Ontology,
  OntologyEntityDescriptor,
  OntologyRelationshipDescriptor,
  RelationshipKind,
} from "./types";

const ENTITY_LABELS: Record<EntityKind, string> = {
  person: "Person",
  department: "Department",
  site: "Site",
  asset: "Asset",
  incident: "Incident",
  risk: "Risk",
  inspection: "Inspection",
  task: "Task",
  report: "Report",
  policy: "Policy",
  sop: "SOP",
  decision: "Decision",
  recommendation: "Recommendation",
  system: "System",
  connector: "Connector",
  tool: "Tool",
  agent: "Agent",
  capability: "Capability",
  objective: "Objective",
  project: "Project",
  evidence: "Evidence",
};

const ALL_ENTITY_KINDS = Object.keys(ENTITY_LABELS) as readonly EntityKind[];

function ent(
  kind: EntityKind,
  required: readonly string[] = [],
  optional: readonly string[] = [],
): OntologyEntityDescriptor {
  return Object.freeze({
    kind,
    label: ENTITY_LABELS[kind],
    required_attributes: Object.freeze([...required]) as readonly string[],
    optional_attributes: Object.freeze([...optional]) as readonly string[],
  });
}

function rel(
  kind: RelationshipKind,
  allowed_from: readonly EntityKind[],
  allowed_to: readonly EntityKind[],
  opts: {
    inverse?: RelationshipKind;
    symmetric?: boolean;
    transitive?: boolean;
  } = {},
): OntologyRelationshipDescriptor {
  return Object.freeze({
    kind,
    label: kind,
    inverse: opts.inverse,
    symmetric: opts.symmetric ?? false,
    transitive: opts.transitive ?? false,
    allowed_from: Object.freeze([...allowed_from]) as readonly EntityKind[],
    allowed_to: Object.freeze([...allowed_to]) as readonly EntityKind[],
  });
}

const ENTITY_DESCRIPTORS = Object.freeze({
  person: ent("person", ["canonical_name"], ["email", "role"]),
  department: ent("department", ["canonical_name"], ["site_id"]),
  site: ent("site", ["canonical_name"], ["region"]),
  asset: ent("asset", ["canonical_name"], ["asset_tag", "criticality"]),
  incident: ent("incident", ["canonical_name"], ["severity", "opened_at"]),
  risk: ent("risk", ["canonical_name"], ["likelihood", "impact"]),
  inspection: ent("inspection", ["canonical_name"], ["scheduled_at"]),
  task: ent("task", ["canonical_name"], ["due_at", "status"]),
  report: ent("report", ["canonical_name"], ["period"]),
  policy: ent("policy", ["canonical_name"], ["version"]),
  sop: ent("sop", ["canonical_name"], ["version"]),
  decision: ent("decision", ["canonical_name"], ["decided_at"]),
  recommendation: ent("recommendation", ["canonical_name"], []),
  system: ent("system", ["canonical_name"], []),
  connector: ent("connector", ["canonical_name"], []),
  tool: ent("tool", ["canonical_name"], []),
  agent: ent("agent", ["canonical_name"], []),
  capability: ent("capability", ["canonical_name"], []),
  objective: ent("objective", ["canonical_name"], []),
  project: ent("project", ["canonical_name"], []),
  evidence: ent("evidence", ["canonical_name"], []),
});

const RELATIONSHIP_DESCRIPTORS = Object.freeze({
  owns: rel("owns", ALL_ENTITY_KINDS, ALL_ENTITY_KINDS, { inverse: "belongs_to" }),
  belongs_to: rel("belongs_to", ALL_ENTITY_KINDS, ALL_ENTITY_KINDS, { inverse: "owns" }),
  located_at: rel("located_at", ALL_ENTITY_KINDS, ["site", "department"]),
  caused_by: rel("caused_by", ["incident", "risk", "report"], ALL_ENTITY_KINDS),
  related_to: rel("related_to", ALL_ENTITY_KINDS, ALL_ENTITY_KINDS, { symmetric: true }),
  depends_on: rel("depends_on", ALL_ENTITY_KINDS, ALL_ENTITY_KINDS, { transitive: true }),
  assigned_to: rel("assigned_to", ["task", "incident", "inspection", "project", "objective"], ["person", "department", "agent"]),
  reported_by: rel("reported_by", ["incident", "report", "inspection"], ["person", "agent", "system"]),
  approved_by: rel("approved_by", ["decision", "recommendation", "policy", "sop"], ["person", "department"]),
  violates: rel("violates", ALL_ENTITY_KINDS, ["policy", "sop"]),
  mitigates: rel("mitigates", ["task", "decision", "recommendation", "sop"], ["risk", "incident"]),
  supports: rel("supports", ALL_ENTITY_KINDS, ["decision", "recommendation", "objective"]),
  contradicts: rel("contradicts", ALL_ENTITY_KINDS, ALL_ENTITY_KINDS, { symmetric: true }),
  replaces: rel("replaces", ALL_ENTITY_KINDS, ALL_ENTITY_KINDS),
  references: rel("references", ALL_ENTITY_KINDS, ALL_ENTITY_KINDS),
  requires: rel("requires", ALL_ENTITY_KINDS, ALL_ENTITY_KINDS, { transitive: true }),
});

export const ONTOLOGY: Ontology = Object.freeze({
  entities: ENTITY_DESCRIPTORS,
  relationships: RELATIONSHIP_DESCRIPTORS,
});

export function describeEntity(kind: EntityKind): OntologyEntityDescriptor {
  return ONTOLOGY.entities[kind];
}

export function describeRelationship(kind: RelationshipKind): OntologyRelationshipDescriptor {
  return ONTOLOGY.relationships[kind];
}

export function allowsEdge(
  kind: RelationshipKind,
  from: EntityKind,
  to: EntityKind,
): boolean {
  const desc = ONTOLOGY.relationships[kind];
  return desc.allowed_from.includes(from) && desc.allowed_to.includes(to);
}
