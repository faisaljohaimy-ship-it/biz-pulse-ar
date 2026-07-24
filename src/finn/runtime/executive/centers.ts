/**
 * Executive Shell — Notification Center · Activity Center · Task Center ·
 * Session Manager.
 *
 * Bounded, observable in-shell centers. The session manager owns lifecycle
 * (start/renew/end) over an injected clock and feeds the Phase-2 context
 * manager — it never trusts client-supplied identity claims.
 */
import { ShellError, type IdFactory } from "../types";
import type { EventBus } from "../event-bus";
import type { Actor } from "@/finn/shell";
import type { ShellContextManager } from "../managers";

export type Severity = "info" | "success" | "warning" | "critical";

export interface ShellNotification {
  readonly id: string;
  readonly severity: Severity;
  readonly title: string;
  readonly body?: string;
  readonly read: boolean;
  readonly atISO: string;
}

export type Clock = () => string;

export class NotificationCenter {
  private items: ShellNotification[] = [];

  constructor(
    private readonly events: EventBus,
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
    private readonly limit = 200,
  ) {}

  async post(input: {
    severity: Severity;
    title: string;
    body?: string;
  }): Promise<ShellNotification> {
    const item: ShellNotification = {
      id: this.idFactory(),
      severity: input.severity,
      title: input.title,
      ...(input.body ? { body: input.body } : {}),
      read: false,
      atISO: this.clock(),
    };
    this.items.unshift(item);
    while (this.items.length > this.limit) this.items.pop();
    await this.events.publish("shell.notification", { id: item.id, severity: item.severity });
    return item;
  }

  markRead(id: string): boolean {
    const idx = this.items.findIndex((n) => n.id === id);
    if (idx === -1) return false;
    this.items[idx] = { ...this.items[idx], read: true };
    return true;
  }

  dismiss(id: string): boolean {
    const before = this.items.length;
    this.items = this.items.filter((n) => n.id !== id);
    return this.items.length !== before;
  }

  list(filter: { unreadOnly?: boolean } = {}): readonly ShellNotification[] {
    return filter.unreadOnly ? this.items.filter((n) => !n.read) : [...this.items];
  }

  unreadCount(): number {
    return this.items.filter((n) => !n.read).length;
  }
}

export interface ActivityEntry {
  readonly id: string;
  readonly kind: string;
  readonly summary: string;
  readonly atISO: string;
}

export class ActivityCenter {
  private readonly entries: ActivityEntry[] = [];

  constructor(
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
    private readonly limit = 300,
  ) {}

  record(kind: string, summary: string): ActivityEntry {
    const entry: ActivityEntry = { id: this.idFactory(), kind, summary, atISO: this.clock() };
    this.entries.unshift(entry);
    while (this.entries.length > this.limit) this.entries.pop();
    return entry;
  }

  list(kind?: string): readonly ActivityEntry[] {
    return kind ? this.entries.filter((e) => e.kind === kind) : [...this.entries];
  }
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled";

export interface ShellTask {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly progress: number; // 0..100
  readonly atISO: string;
}

const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["pending"], // retry re-queues
  cancelled: [],
};

export class TaskCenter {
  private readonly tasks = new Map<string, ShellTask>();

  constructor(
    private readonly events: EventBus,
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
  ) {}

  async create(title: string): Promise<ShellTask> {
    const task: ShellTask = {
      id: this.idFactory(),
      title,
      status: "pending",
      progress: 0,
      atISO: this.clock(),
    };
    this.tasks.set(task.id, task);
    await this.events.publish("shell.task.created", { id: task.id });
    return task;
  }

  async transition(id: string, status: TaskStatus, progress?: number): Promise<ShellTask> {
    const task = this.tasks.get(id);
    if (!task) throw new ShellError("tasks", `unknown task "${id}"`);
    if (!TRANSITIONS[task.status].includes(status)) {
      throw new ShellError("tasks", `illegal transition ${task.status} → ${status}`);
    }
    const next: ShellTask = {
      ...task,
      status,
      progress: Math.max(0, Math.min(100, progress ?? task.progress)),
    };
    this.tasks.set(id, next);
    await this.events.publish("shell.task.updated", { id, status });
    return next;
  }

  list(status?: TaskStatus): readonly ShellTask[] {
    const all = [...this.tasks.values()];
    return status ? all.filter((t) => t.status === status) : all;
  }
}

// ── Session Manager ─────────────────────────────────────────────────────────

export interface ShellSession {
  readonly id: string;
  readonly startedAtISO: string;
  readonly lastActivityISO: string;
  readonly active: boolean;
}

export class SessionManager {
  private session: ShellSession | null = null;

  constructor(
    private readonly context: ShellContextManager,
    private readonly events: EventBus,
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
    private readonly idleLimitMs = 30 * 60_000,
  ) {}

  /** Start a session for a SERVER-VERIFIED actor (never a client claim). */
  async start(actor: Actor, locale: "ar" | "en" = "ar"): Promise<ShellSession> {
    const now = this.clock();
    this.session = { id: this.idFactory(), startedAtISO: now, lastActivityISO: now, active: true };
    this.context.update({ actor, locale, requestId: this.session.id });
    await this.events.publish("shell.session.started", { id: this.session.id });
    return this.session;
  }

  touch(): ShellSession | null {
    if (!this.session?.active) return this.session;
    this.session = { ...this.session, lastActivityISO: this.clock() };
    return this.session;
  }

  /** Idle policy check against the injected clock; expires ⇒ ends the session. */
  async checkIdle(): Promise<{ expired: boolean }> {
    if (!this.session?.active) return { expired: false };
    const idleMs = Date.parse(this.clock()) - Date.parse(this.session.lastActivityISO);
    if (idleMs > this.idleLimitMs) {
      await this.end("idle-timeout");
      return { expired: true };
    }
    return { expired: false };
  }

  async end(reason: string): Promise<void> {
    if (!this.session) return;
    this.session = { ...this.session, active: false };
    this.context.reset();
    await this.events.publish("shell.session.ended", { id: this.session.id, reason });
  }

  current(): ShellSession | null {
    return this.session;
  }
}
