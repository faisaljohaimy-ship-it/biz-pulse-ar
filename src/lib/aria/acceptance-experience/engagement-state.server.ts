// Engagement state — deterministic transitions from user activity.
import type { EngagementLevel } from "./types";

interface Row {
  level: EngagementLevel;
  lastActivity: number;
  turns: number;
}
const R = new Map<string, Row>();

const IDLE_MS = 45_000;
const DISENGAGED_MS = 120_000;

export function noteEngagement(id: string, kind: "user_input" | "user_voice" | "tick" | "ariaSpoke"): EngagementLevel {
  const now = Date.now();
  const cur = R.get(id) ?? { level: "dormant" as EngagementLevel, lastActivity: now, turns: 0 };
  if (kind === "tick") {
    const gap = now - cur.lastActivity;
    if (gap > DISENGAGED_MS) cur.level = "disengaged";
    else if (gap > IDLE_MS) cur.level = downgrade(cur.level);
  } else if (kind === "ariaSpoke") {
    // no upgrade; ARIA speaking alone does not imply user engagement
  } else {
    cur.lastActivity = now;
    cur.turns += 1;
    cur.level = upgrade(cur.level, cur.turns);
  }
  R.set(id, cur);
  return cur.level;
}

export function getEngagement(id: string): EngagementLevel {
  return R.get(id)?.level ?? "dormant";
}

export function resetEngagement(id: string): void { R.delete(id); }

function upgrade(l: EngagementLevel, turns: number): EngagementLevel {
  if (turns >= 4) return "committed";
  if (turns >= 2) return "active";
  return "attentive";
}

function downgrade(l: EngagementLevel): EngagementLevel {
  switch (l) {
    case "committed": return "active";
    case "active": return "attentive";
    case "attentive": return "dormant";
    case "disengaged": return "disengaged";
    case "dormant": return "dormant";
  }
}
