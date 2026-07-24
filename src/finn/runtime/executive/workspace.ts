/**
 * Executive Shell — Workspace Manager · Window Manager · Dock Manager ·
 * Layout Engine · deep links.
 *
 * A pure runtime model (no UI): workspaces own windows; windows are docked or
 * floating; docks order their panels; the layout engine snapshots/applies the
 * whole arrangement; everything round-trips through the persistence manager so
 * a restart restores the exact executive arrangement. Deep links address a
 * workspace (and optionally a module) as `nexios://workspace/<id>?module=<m>`.
 */
import { ShellError, type IdFactory } from "../types";
import type { PersistenceManager } from "./persistence";

export type DockZone = "left" | "right" | "bottom" | "main";

export interface WindowRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface WindowState {
  readonly id: string;
  readonly moduleId: string;
  readonly mode: "docked" | "floating";
  readonly dock: DockZone;
  readonly rect: WindowRect | null;
  readonly z: number;
}

export interface WorkspaceSnapshot {
  readonly id: string;
  readonly name: string;
  readonly windows: readonly WindowState[];
  readonly pinnedModules: readonly string[];
}

const isSnapshot = (w: WorkspaceSnapshot): boolean =>
  typeof w?.id === "string" && typeof w?.name === "string" && Array.isArray(w?.windows);

export class WindowManager {
  private windows = new Map<string, WindowState>();
  private zTop = 0;

  constructor(private readonly idFactory: IdFactory) {}

  open(
    moduleId: string,
    options: { mode?: "docked" | "floating"; dock?: DockZone } = {},
  ): WindowState {
    const win: WindowState = {
      id: this.idFactory(),
      moduleId,
      mode: options.mode ?? "docked",
      dock: options.dock ?? "main",
      rect: options.mode === "floating" ? { x: 80, y: 80, w: 640, h: 420 } : null,
      z: ++this.zTop,
    };
    this.windows.set(win.id, win);
    return win;
  }

  close(windowId: string): boolean {
    return this.windows.delete(windowId);
  }

  focus(windowId: string): WindowState {
    const win = this.require(windowId);
    const next = { ...win, z: ++this.zTop };
    this.windows.set(windowId, next);
    return next;
  }

  moveResize(windowId: string, rect: WindowRect): WindowState {
    const win = this.require(windowId);
    if (win.mode !== "floating") {
      throw new ShellError("windows", `window "${windowId}" is docked — undock before moving`);
    }
    const next = { ...win, rect };
    this.windows.set(windowId, next);
    return next;
  }

  setMode(windowId: string, mode: "docked" | "floating", dock: DockZone = "main"): WindowState {
    const win = this.require(windowId);
    const next: WindowState = {
      ...win,
      mode,
      dock,
      rect: mode === "floating" ? (win.rect ?? { x: 80, y: 80, w: 640, h: 420 }) : null,
    };
    this.windows.set(windowId, next);
    return next;
  }

  /** Highest-z first — render/focus order. */
  list(): readonly WindowState[] {
    return [...this.windows.values()].sort((a, b) => b.z - a.z);
  }

  get(windowId: string): WindowState | undefined {
    return this.windows.get(windowId);
  }

  restore(windows: readonly WindowState[]): void {
    this.windows = new Map(windows.map((w) => [w.id, w]));
    this.zTop = windows.reduce((m, w) => Math.max(m, w.z), 0);
  }

  private require(windowId: string): WindowState {
    const win = this.windows.get(windowId);
    if (!win) throw new ShellError("windows", `unknown window "${windowId}"`);
    return win;
  }
}

export class DockManager {
  constructor(private readonly windowManager: WindowManager) {}

  panels(zone: DockZone): readonly WindowState[] {
    return this.windowManager
      .list()
      .filter((w) => w.mode === "docked" && w.dock === zone)
      .sort((a, b) => a.z - b.z);
  }

  moveTo(windowId: string, zone: DockZone): WindowState {
    return this.windowManager.setMode(windowId, "docked", zone);
  }

  float(windowId: string): WindowState {
    return this.windowManager.setMode(windowId, "floating");
  }
}

export class LayoutEngine {
  constructor(private readonly windowManager: WindowManager) {}

  snapshot(): readonly WindowState[] {
    return this.windowManager.list();
  }

  apply(windows: readonly WindowState[]): void {
    this.windowManager.restore(windows);
  }
}

const PERSIST_NS = "workspaces";

interface PersistedWorkspaces {
  readonly active: string;
  readonly workspaces: readonly WorkspaceSnapshot[];
}

export class WorkspaceManager {
  private workspaces = new Map<string, WorkspaceSnapshot>();
  private activeId: string;

  constructor(
    private readonly windowManager: WindowManager,
    private readonly layout: LayoutEngine,
    private readonly persistence: PersistenceManager,
    private readonly idFactory: IdFactory,
  ) {
    const restored = this.persistence.load<PersistedWorkspaces>(
      PERSIST_NS,
      { active: "", workspaces: [] },
      (d) => Array.isArray(d.workspaces) && d.workspaces.every(isSnapshot),
    );
    for (const ws of restored.workspaces) this.workspaces.set(ws.id, ws);
    if (restored.active && this.workspaces.has(restored.active)) {
      this.activeId = restored.active;
      this.layout.apply(this.workspaces.get(restored.active)!.windows);
    } else {
      const home = this.createInternal("الرئيسية");
      this.activeId = home.id;
    }
  }

  private createInternal(name: string): WorkspaceSnapshot {
    const ws: WorkspaceSnapshot = { id: this.idFactory(), name, windows: [], pinnedModules: [] };
    this.workspaces.set(ws.id, ws);
    return ws;
  }

  create(name: string): WorkspaceSnapshot {
    const ws = this.createInternal(name);
    this.persist();
    return ws;
  }

  active(): WorkspaceSnapshot {
    return this.workspaces.get(this.activeId)!;
  }

  list(): readonly WorkspaceSnapshot[] {
    return [...this.workspaces.values()];
  }

  /** Save the LIVE layout into the active workspace, then persist all. */
  saveActive(): WorkspaceSnapshot {
    const current = this.active();
    const saved: WorkspaceSnapshot = { ...current, windows: this.layout.snapshot() };
    this.workspaces.set(saved.id, saved);
    this.persist();
    return saved;
  }

  switchTo(workspaceId: string): WorkspaceSnapshot {
    const target = this.workspaces.get(workspaceId);
    if (!target) throw new ShellError("workspaces", `unknown workspace "${workspaceId}"`);
    this.saveActive(); // never lose the outgoing arrangement
    this.activeId = workspaceId;
    this.layout.apply(target.windows);
    this.persist();
    return target;
  }

  pinModule(moduleId: string): void {
    const ws = this.active();
    if (ws.pinnedModules.includes(moduleId)) return;
    this.workspaces.set(ws.id, { ...ws, pinnedModules: [...ws.pinnedModules, moduleId] });
    this.persist();
  }

  remove(workspaceId: string): boolean {
    if (workspaceId === this.activeId) {
      throw new ShellError("workspaces", "cannot remove the active workspace");
    }
    const removed = this.workspaces.delete(workspaceId);
    if (removed) this.persist();
    return removed;
  }

  /** nexios://workspace/<id>?module=<moduleId> */
  deepLink(workspaceId: string, moduleId?: string): string {
    return `nexios://workspace/${encodeURIComponent(workspaceId)}${
      moduleId ? `?module=${encodeURIComponent(moduleId)}` : ""
    }`;
  }

  resolveDeepLink(link: string): { workspaceId: string; moduleId?: string } | null {
    const match = /^nexios:\/\/workspace\/([^?]+)(?:\?module=(.+))?$/.exec(link);
    if (!match) return null;
    const workspaceId = decodeURIComponent(match[1]);
    if (!this.workspaces.has(workspaceId)) return null;
    return {
      workspaceId,
      ...(match[2] ? { moduleId: decodeURIComponent(match[2]) } : {}),
    };
  }

  openDeepLink(link: string): WorkspaceSnapshot | null {
    const resolved = this.resolveDeepLink(link);
    if (!resolved) return null;
    const ws = this.switchTo(resolved.workspaceId);
    if (resolved.moduleId) this.windowManager.open(resolved.moduleId);
    return ws;
  }

  private persist(): void {
    this.persistence.save<PersistedWorkspaces>(PERSIST_NS, {
      active: this.activeId,
      workspaces: [...this.workspaces.values()],
    });
  }
}
