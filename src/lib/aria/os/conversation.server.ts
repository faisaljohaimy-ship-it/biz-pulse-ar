/**
 * Phase 8.9 — Conversation orchestration for the executive OS.
 *
 * Owns conversation state, context stitching (last N turns → BrainRequest),
 * and mission continuity (linking follow-up turns to prior missions).
 * Never bypasses Executive Memory — the Brain still reads / writes its
 * own `session-memory` under `sessionId`.
 */

import { recordConversationTurn } from "./timeline.server";
import type { BrainRequest, BrainTurn } from "../executive-brain/types";
import type {
  ExecutiveArtifactId,
  ExecutiveConversation,
  ExecutiveConversationId,
  ExecutiveConversationTurn,
  ExecutiveSessionId,
  ExecutiveWorkspaceId,
} from "./types";

const CONVERSATIONS = new Map<ExecutiveConversationId, ExecutiveConversation>();
const BY_SESSION = new Map<ExecutiveSessionId, ExecutiveConversationId>();

function uid(): string {
  return `cnv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function openConversation(session_id: ExecutiveSessionId): ExecutiveConversation {
  const existing = BY_SESSION.get(session_id);
  if (existing) {
    const cur = CONVERSATIONS.get(existing);
    if (cur) return cur;
  }
  const now = new Date().toISOString();
  const cnv: ExecutiveConversation = {
    id: uid(),
    session_id,
    turns: [],
    started_at: now,
    updated_at: now,
  };
  CONVERSATIONS.set(cnv.id, cnv);
  BY_SESSION.set(session_id, cnv.id);
  return cnv;
}

export function appendTurn(
  session_id: ExecutiveSessionId,
  workspace_id: ExecutiveWorkspaceId,
  turn: Omit<ExecutiveConversationTurn, "ts">,
  answer_ref?: ExecutiveArtifactId,
): ExecutiveConversation {
  const cnv = openConversation(session_id);
  const complete: ExecutiveConversationTurn = {
    ...turn,
    ts: new Date().toISOString(),
    answer_ref: answer_ref ?? turn.answer_ref,
  };
  const next: ExecutiveConversation = {
    ...cnv,
    turns: [...cnv.turns, complete].slice(-100),
    updated_at: complete.ts,
  };
  CONVERSATIONS.set(next.id, next);
  recordConversationTurn(session_id, workspace_id, {
    role: complete.role,
    length: complete.text.length,
    answer_ref: complete.answer_ref,
  });
  return next;
}

export function getConversation(session_id: ExecutiveSessionId): ExecutiveConversation | null {
  const id = BY_SESSION.get(session_id);
  return id ? (CONVERSATIONS.get(id) ?? null) : null;
}

/**
 * Build a BrainRequest history slice suitable for the Executive Brain,
 * without duplicating memory (the Brain still loads its own Executive
 * Memory under `sessionId`).
 */
export function stitchHistory(session_id: ExecutiveSessionId, limit = 8): BrainTurn[] {
  const cnv = getConversation(session_id);
  if (!cnv) return [];
  return cnv.turns.slice(-limit).map((t) => ({
    role: t.role,
    text: t.text,
    ts: t.ts,
  }));
}

/**
 * Compose a BrainRequest from a live question + session context.
 * The caller may override any field.
 */
export function composeBrainRequest(input: {
  session_id: ExecutiveSessionId;
  question: string;
  lang?: BrainRequest["lang"];
  page?: BrainRequest["page"];
  widgets?: BrainRequest["widgets"];
  anchors?: BrainRequest["anchors"];
  historyLimit?: number;
}): BrainRequest {
  return {
    question: input.question,
    lang: input.lang,
    page: input.page,
    widgets: input.widgets,
    anchors: input.anchors,
    history: stitchHistory(input.session_id, input.historyLimit ?? 8),
    sessionId: input.session_id,
  };
}
