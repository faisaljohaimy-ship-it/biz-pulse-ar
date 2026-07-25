/** NEXIOS Adaptive Shell — public surface (Shell Population Phase 1). No Core imports; no globals. */
export { AdaptiveShellError, MANIFEST_KINDS, type ManifestKind } from "./types";
export {
  agentManifestSchema,
  anyManifestSchema,
  capabilityManifestSchema,
  skillManifestSchema,
  toolManifestSchema,
  type AgentManifest,
  type AnyManifest,
  type CapabilityManifest,
  type SkillManifest,
  type ToolManifest,
} from "./schemas/manifests";
export {
  AgentRegistry,
  CapabilityRegistry,
  SkillRegistry,
  ToolRegistry,
} from "./registry/registries";
export { VersionRegistry } from "./registry/version-registry";
export { MetadataRegistry } from "./metadata/metadata-registry";
export { ManifestLoader, type LoadReport, type LoadResult } from "./registry/manifest-loader";
export { DependencyResolver, type ResolutionReport } from "./registry/dependency-resolver";
export { AdaptiveShellRegistry, type RegistrySummary } from "./registry/shell-registry";
export {
  createAdaptiveShell,
  discoveredCandidates,
  populateRegistry,
  type DiscoveryReport,
} from "./registry/discovery";
/* Shell Population Phase 5 — additive registry infrastructure. */
export * from "./population";
/* Agent Runtime Foundation Phase 6 — additive hosting runtime. */
export * from "./agent-runtime";
