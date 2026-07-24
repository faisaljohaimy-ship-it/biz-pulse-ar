/**
 * Executive Shell — Command System + Palette + Global Search.
 *
 * ONE command layer executes everything: open module, open agent, switch
 * workspace, run skill, search knowledge, settings, quick actions. Commands
 * are registered against the registry (plugins get a scoped registrar so
 * hot-unload removes theirs), optionally permission-gated, and ranked for the
 * palette with a deterministic prefix/substring scorer. The global search
 * engine aggregates pluggable providers and isolates provider failures.
 */
import { ShellError } from "../types";
import type { ShellContext } from "../managers";
import type { Diagnostics } from "../diagnostics";

export interface CommandDefinition {
  readonly id: string;
  readonly title: string;
  readonly titleAr?: string;
  readonly category:
    | "modules"
    | "agents"
    | "workspaces"
    | "workflows"
    | "knowledge"
    | "settings"
    | "quick";
  readonly keywords: readonly string[];
  /** When set, execution requires this permission to be granted in context. */
  readonly requiresPermission?: string;
  run(context: ShellContext, args?: Record<string, unknown>): unknown | Promise<unknown>;
}

export interface CommandExecution {
  readonly ok: boolean;
  readonly commandId: string;
  readonly result?: unknown;
  readonly error?: string;
}

export type PermissionCheck = (permission: string, context: ShellContext) => boolean;

export class CommandRegistry {
  private readonly commands = new Map<string, { def: CommandDefinition; owner: string }>();
  private readonly recents: string[] = [];

  constructor(
    private readonly diagnostics: Diagnostics,
    private readonly permissionCheck: PermissionCheck,
  ) {}

  register(def: CommandDefinition, owner = "shell"): () => void {
    if (this.commands.has(def.id)) {
      throw new ShellError("commands", `duplicate command "${def.id}"`);
    }
    this.commands.set(def.id, { def, owner });
    return () => void this.commands.delete(def.id);
  }

  /** Remove every command an owner (e.g. an unloaded plugin) registered. */
  unregisterOwner(owner: string): number {
    let removed = 0;
    for (const [id, entry] of this.commands) {
      if (entry.owner === owner) {
        this.commands.delete(id);
        removed++;
      }
    }
    return removed;
  }

  list(): readonly CommandDefinition[] {
    return [...this.commands.values()].map((c) => c.def);
  }

  async execute(
    commandId: string,
    context: ShellContext,
    args?: Record<string, unknown>,
  ): Promise<CommandExecution> {
    const entry = this.commands.get(commandId);
    if (!entry) return { ok: false, commandId, error: "unknown-command" };
    const { def } = entry;
    if (def.requiresPermission && !this.permissionCheck(def.requiresPermission, context)) {
      this.diagnostics.record("warn", "commands", "permission denied", { commandId });
      return { ok: false, commandId, error: "permission-denied" };
    }
    try {
      const result = await def.run(context, args);
      this.pushRecent(commandId);
      this.diagnostics.record("info", "commands", "executed", { commandId });
      return { ok: true, commandId, result };
    } catch (error) {
      // Crash isolation: a failing command NEVER propagates into the shell.
      const message = error instanceof Error ? error.message : String(error);
      this.diagnostics.record("error", "commands", "command crashed", { commandId, message });
      return { ok: false, commandId, error: message };
    }
  }

  private pushRecent(commandId: string): void {
    const idx = this.recents.indexOf(commandId);
    if (idx !== -1) this.recents.splice(idx, 1);
    this.recents.unshift(commandId);
    while (this.recents.length > 20) this.recents.pop();
  }

  recentIds(): readonly string[] {
    return [...this.recents];
  }
}

export interface PaletteHit {
  readonly command: CommandDefinition;
  readonly score: number;
}

/** Deterministic ranking: exact id > title prefix > keyword > substring > recent. */
export class CommandPalette {
  constructor(private readonly registry: CommandRegistry) {}

  query(text: string, limit = 10): readonly PaletteHit[] {
    const q = text.trim().toLowerCase();
    const recents = this.registry.recentIds();
    const hits: PaletteHit[] = [];
    for (const command of this.registry.list()) {
      let score = 0;
      const title = command.title.toLowerCase();
      const titleAr = command.titleAr ?? "";
      if (!q)
        score = 1; // empty query lists everything (recents boost below)
      else if (command.id === q) score = 100;
      else if (title.startsWith(q) || titleAr.startsWith(q)) score = 60;
      else if (command.keywords.some((k) => k.toLowerCase().startsWith(q))) score = 40;
      else if (title.includes(q) || titleAr.includes(q)) score = 20;
      else if (command.keywords.some((k) => k.toLowerCase().includes(q))) score = 10;
      if (score === 0) continue;
      const recentIdx = recents.indexOf(command.id);
      if (recentIdx !== -1) score += Math.max(0, 5 - recentIdx);
      hits.push({ command, score });
    }
    return hits
      .sort((a, b) => b.score - a.score || a.command.id.localeCompare(b.command.id))
      .slice(0, limit);
  }
}

// ── Global Search ───────────────────────────────────────────────────────────

export interface SearchResult {
  readonly providerId: string;
  readonly kind: string;
  readonly id: string;
  readonly title: string;
  readonly score: number;
}

export interface SearchProvider {
  readonly id: string;
  search(query: string): readonly SearchResult[] | Promise<readonly SearchResult[]>;
}

export class GlobalSearchEngine {
  private readonly providers = new Map<string, SearchProvider>();

  constructor(private readonly diagnostics: Diagnostics) {}

  registerProvider(provider: SearchProvider): () => void {
    if (this.providers.has(provider.id)) {
      throw new ShellError("search", `duplicate search provider "${provider.id}"`);
    }
    this.providers.set(provider.id, provider);
    return () => void this.providers.delete(provider.id);
  }

  /** Aggregate all providers; one provider failing never sinks the search. */
  async search(query: string, limit = 20): Promise<readonly SearchResult[]> {
    const all: SearchResult[] = [];
    for (const provider of this.providers.values()) {
      try {
        all.push(...(await provider.search(query)));
      } catch (error) {
        this.diagnostics.record("warn", "search", "provider failed (isolated)", {
          providerId: provider.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return all.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
  }
}
