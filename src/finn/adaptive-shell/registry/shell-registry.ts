/**
 * Adaptive Shell Registry — the composition of every shell registry.
 *
 * Dynamic registration is the ONLY way in: a manifest is registered into its
 * typed registry, its version recorded (conflicts refused), its manifest
 * metadata attached. validate() runs the dependency resolver over the whole
 * population. No hardcoded lists anywhere — the registry starts empty and is
 * populated by discovery or explicit runtime registration.
 */
import { AdaptiveShellError } from "../types";
import type { AnyManifest } from "../schemas/manifests";
import { AgentRegistry, CapabilityRegistry, SkillRegistry, ToolRegistry } from "./registries";
import { VersionRegistry } from "./version-registry";
import { MetadataRegistry } from "../metadata/metadata-registry";
import { DependencyResolver, type ResolutionReport } from "./dependency-resolver";

export interface RegistrySummary {
  readonly skills: number;
  readonly agents: number;
  readonly tools: number;
  readonly capabilities: number;
  readonly versions: number;
  readonly metadata: number;
}

export class AdaptiveShellRegistry {
  readonly skills = new SkillRegistry();
  readonly agents = new AgentRegistry();
  readonly tools = new ToolRegistry();
  readonly capabilities = new CapabilityRegistry();
  readonly versions = new VersionRegistry();
  readonly metadata = new MetadataRegistry();
  private readonly resolver = new DependencyResolver(
    this.skills,
    this.agents,
    this.tools,
    this.capabilities,
  );

  /** Dynamic registration — schema-validated manifests only. */
  register(manifest: AnyManifest): void {
    switch (manifest.kind) {
      case "skill":
        this.skills.register(manifest);
        break;
      case "agent":
        this.agents.register(manifest);
        break;
      case "tool":
        this.tools.register(manifest);
        break;
      case "capability":
        this.capabilities.register(manifest);
        break;
      default:
        throw new AdaptiveShellError("registry", "unknown manifest kind");
    }
    const version = "version" in manifest ? manifest.version : "1.0.0";
    this.versions.register(manifest.kind, manifest.id, version);
    this.metadata.attach(manifest.kind, manifest.id, manifest.metadata);
  }

  /** Cross-registry validation: references, dependencies, permissions. */
  validate(): ResolutionReport {
    return this.resolver.resolve();
  }

  /** Skill execution order (dependencies first); cycles refused. */
  skillOrder(): readonly string[] {
    return this.resolver.skillOrder();
  }

  summary(): RegistrySummary {
    return {
      skills: this.skills.count(),
      agents: this.agents.count(),
      tools: this.tools.count(),
      capabilities: this.capabilities.count(),
      versions: this.versions.count(),
      metadata: this.metadata.count(),
    };
  }
}
