/**
 * Pack integration loader — the vendored packs walk through the Shell's
 * ONE admission door.
 *
 * Data-driven (parsed JSON in, reports out): no filesystem access, no
 * network, browser-safe. Every skill goes through `shell.admitSkill`,
 * every agent through `runtime.admitAgent`, every tool through the
 * Phase-1 ToolRegistry after schema validation. Categories the packs
 * introduce are registered explicitly first (typo-proof law). Nothing is
 * activated — records land as `registered` drafts behind the blocking
 * descriptor-only policy.
 */
import { toolManifestSchema } from "../schemas/manifests";
import type { ToolRegistry } from "../registry/registries";
import type { ShellPopulation } from "../population/discovery-engine";
import type { AgentRuntime } from "../agent-runtime/runtime";
import {
  adaptAgent,
  adaptSkill,
  adaptTool,
  type PackAgentDescriptor,
  type PackSkillDescriptor,
  type PackToolDescriptor,
} from "./adapters";

export interface PackData {
  readonly skills: readonly PackSkillDescriptor[];
  readonly agents: readonly PackAgentDescriptor[];
  readonly tools: readonly PackToolDescriptor[];
}

export interface RejectionDetail {
  readonly id: string;
  readonly issues: readonly string[];
}

export interface PackIntegrationReport {
  readonly categoriesRegistered: readonly string[];
  readonly skills: { readonly admitted: number; readonly rejected: readonly RejectionDetail[] };
  readonly agents: { readonly admitted: number; readonly rejected: readonly RejectionDetail[] };
  readonly tools: { readonly admitted: number; readonly rejected: readonly RejectionDetail[] };
}

export interface PackIntegrationTargets {
  readonly shell: ShellPopulation;
  readonly runtime: AgentRuntime;
  readonly toolRegistry: ToolRegistry;
}

export function integrateContentPacks(
  data: PackData,
  targets: PackIntegrationTargets,
): PackIntegrationReport {
  const { shell, runtime, toolRegistry } = targets;

  /* Categories first — admission fails closed on unregistered taxonomy. */
  const packCategories = new Set<string>([
    ...data.skills.map((s) => s.category),
    ...data.agents.map((a) => a.category),
  ]);
  const categoriesRegistered: string[] = [];
  for (const category of [...packCategories].sort()) {
    for (const registry of [shell.categories, runtime.categories]) {
      if (!registry.has(category)) {
        registry.register({ id: category, description: `Content-pack category: ${category}` });
      }
    }
    if (!categoriesRegistered.includes(category)) categoriesRegistered.push(category);
  }

  const skillRejections: RejectionDetail[] = [];
  let skillsAdmitted = 0;
  for (const descriptor of data.skills) {
    const report = shell.admitSkill(adaptSkill(descriptor));
    if (report.admitted) skillsAdmitted += 1;
    else
      skillRejections.push({
        id: report.subjectId,
        issues: report.issues.map((i) => `${i.check}: ${i.detail}`),
      });
  }

  const agentRejections: RejectionDetail[] = [];
  let agentsAdmitted = 0;
  for (const descriptor of data.agents) {
    const report = runtime.admitAgent(adaptAgent(descriptor));
    if (report.admitted) agentsAdmitted += 1;
    else
      agentRejections.push({
        id: report.subjectId,
        issues: report.issues.map((i) => `${i.check}: ${i.detail}`),
      });
  }

  const toolRejections: RejectionDetail[] = [];
  let toolsAdmitted = 0;
  for (const descriptor of data.tools) {
    const parsed = toolManifestSchema.safeParse(adaptTool(descriptor));
    if (!parsed.success) {
      toolRejections.push({
        id: descriptor.id,
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
      continue;
    }
    if (toolRegistry.has(parsed.data.id)) {
      toolRejections.push({ id: parsed.data.id, issues: ["duplicate tool id"] });
      continue;
    }
    toolRegistry.register(parsed.data);
    toolsAdmitted += 1;
  }

  return {
    categoriesRegistered,
    skills: { admitted: skillsAdmitted, rejected: skillRejections },
    agents: { admitted: agentsAdmitted, rejected: agentRejections },
    tools: { admitted: toolsAdmitted, rejected: toolRejections },
  };
}
