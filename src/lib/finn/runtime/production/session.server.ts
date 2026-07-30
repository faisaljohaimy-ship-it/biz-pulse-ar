/**
 * Phase 10.1 — Session lifecycle management.
 */
import type { Session } from "./types";
import type { RuntimeStateStore } from "./state.server";

export class SessionManager {
  constructor(private readonly store: RuntimeStateStore) {}

  open(principal: string, id?: string): Session {
    const now = new Date().toISOString();
    const session: Session = {
      id: id ?? `sess-${crypto.randomUUID()}`,
      principal,
      created_at: now,
      last_seen_at: now,
    };
    this.store.openSession(session);
    return session;
  }

  touch(id: string): Session | undefined {
    return this.store.touchSession(id);
  }

  close(id: string): void {
    this.store.closeSession(id);
  }

  list(): ReadonlyArray<Session> {
    return this.store.listSessions();
  }
}
