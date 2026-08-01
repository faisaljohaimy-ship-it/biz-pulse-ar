/**
 * Official NDK templates — one per mandated kind. Every template is a
 * factory: seed in, complete VALID artifact out (placeholder content, ready
 * to edit). The scaffolder builds on these; tests compile every template.
 */
import type { NdkKind } from "../types";
import type { NdkArtifact } from "../schemas/extended";
import {
  AgentBuilder,
  CapabilityBuilder,
  ConnectorBuilder,
  KnowledgeBuilder,
  PlaybookBuilder,
  PluginBuilder,
  PolicyBuilder,
  SkillBuilder,
  ToolBuilder,
  WorkflowBuilder,
} from "../builders/builders";

export interface TemplateSeed {
  readonly id: string;
  readonly name: string;
  readonly owner?: string;
}

export type TemplateFactory = (seed: TemplateSeed) => NdkArtifact;

/** The ten official templates. */
export const OFFICIAL_TEMPLATES: Readonly<Record<string, TemplateFactory>> = {
  skill: (seed) =>
    new SkillBuilder(seed)
      .set("description", `مهارة ${seed.name} — حرّر الوصف`)
      .set("category", "general")
      .set("inputs", [{ name: "input", type: "string", required: true }])
      .set("outputs", [{ name: "result", type: "string" }])
      .build(),
  agent: (seed) =>
    new AgentBuilder(seed)
      .set("role", "specialist")
      .set("description", `وكيل ${seed.name} — حرّر الوصف`)
      .build(),
  tool: (seed) =>
    new ToolBuilder(seed)
      .set("description", `أداة ${seed.name} — حرّر الوصف`)
      .set("inputs", [{ name: "query", type: "string", required: true }])
      .set("outputs", [{ name: "result", type: "unknown" }])
      .build(),
  capability: (seed) =>
    new CapabilityBuilder(seed).set("description", `قدرة ${seed.name} — حرّر الوصف`).build(),
  workflow: (seed) =>
    new WorkflowBuilder(seed)
      .step({ id: "review", stepKind: "approval", note: "اعتماد بشري إلزامي" })
      .build(),
  connector: (seed) =>
    new ConnectorBuilder({ ...seed, provider: seed.owner ?? "injaz-al-aamal-platform" })
      .capability(`capability.${seed.id.replace(/^connector\./, "")}`)
      .operation("ping", "فحص الاتصال")
      .build(),
  plugin: (seed) =>
    new PluginBuilder({
      ...seed,
      forModule: "platform-runtime",
      entry: `shell://plugin/${seed.id}`,
    }).build(),
  policy: (seed) => new PolicyBuilder(seed).denies("example.action").build(),
  "knowledge-pack": (seed) =>
    new KnowledgeBuilder({ ...seed, domain: "general" })
      .source({ id: "seed-doc", type: "reference", uri: `shell://knowledge/${seed.id}` })
      .build(),
  playbook: (seed) =>
    new PlaybookBuilder({ ...seed, scenario: "سيناريو مرجعي", audience: "executive" })
      .play({ order: 1, title: "الخطوة الأولى", note: "حرّر الخطوات" })
      .build(),
};

export const TEMPLATE_KINDS: readonly NdkKind[] = Object.keys(OFFICIAL_TEMPLATES) as NdkKind[];
