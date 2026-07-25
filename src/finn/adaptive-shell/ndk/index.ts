/** NEXIOS Development Kit — public surface (Shell Population Phase 2). No Core imports; no globals. */
export {
  NDK_KINDS,
  NdkError,
  formatIssues,
  type Clock,
  type NdkKind,
  type NdkPackage,
  type RuntimeDescriptor,
  type SchemaLike,
  type ValidationResult,
} from "./types";
export {
  connectorArtifactSchema,
  knowledgePackArtifactSchema,
  memoryProfileArtifactSchema,
  ndkArtifactSchema,
  playbookArtifactSchema,
  pluginArtifactSchema,
  policyArtifactSchema,
  promptArtifactSchema,
  templateArtifactSchema,
  workflowArtifactSchema,
  type ConnectorArtifact,
  type KnowledgePackArtifact,
  type MemoryProfileArtifact,
  type NdkArtifact,
  type PlaybookArtifact,
  type PluginArtifact,
  type PolicyArtifact,
  type PromptArtifact,
  type TemplateArtifact,
  type WorkflowArtifact,
} from "./schemas/extended";
export {
  AgentBuilder,
  ArtifactBuilder,
  CapabilityBuilder,
  ConnectorBuilder,
  KnowledgeBuilder,
  ManifestBuilder,
  MemoryBuilder,
  PlaybookBuilder,
  PluginBuilder,
  PolicyBuilder,
  PromptBuilder,
  SkillBuilder,
  TemplateBuilder,
  ToolBuilder,
  WorkflowBuilder,
  type BuilderSeed,
} from "./builders/builders";
export {
  CapabilityValidator,
  DependencyValidator,
  ManifestValidator,
  PermissionValidator,
  RuntimeValidator,
  SchemaValidator,
  VersionValidator,
} from "./validators/validators";
export {
  deriveCapabilities,
  derivePermissions,
  generateDependencyGraph,
  generateMetadata,
  generatePackageManifest,
  generateRuntimeDescriptor,
  generateVersionInfo,
  type DependencyGraph,
  type PackageManifestSummary,
  type VersionInfo,
} from "./generators/generators";
export {
  OFFICIAL_TEMPLATES,
  TEMPLATE_KINDS,
  type TemplateFactory,
  type TemplateSeed,
} from "./templates/templates";
export { scaffold } from "./scaffolds/scaffolder";
export { NdkCompiler, type CompileInput, type CompileResult } from "./compiler/compiler";
export { NdkRuntime, createNdk } from "./runtime/ndk-runtime";
