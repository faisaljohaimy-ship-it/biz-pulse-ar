import { ExperienceSchema } from "./contracts";
import type { Experience, LearningCase, LearningMode } from "./types";

const store = new Map<string, Experience>();
const byMission = new Map<string, Set<string>>();

function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function recordExperience(
  input: Omit<Experience, "id" | "capturedAt"> & {
    id?: string;
    capturedAt?: string;
  },
): Experience {
  const experience: Experience = ExperienceSchema.parse({
    id: input.id ?? nextId("exp"),
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    missionId: input.missionId,
    source: input.source,
    capability: input.capability,
    agentId: input.agentId,
    durationMs: input.durationMs,
    success: input.success,
    confidence: input.confidence,
    retries: input.retries,
    rollbacks: input.rollbacks,
    failureClass: input.failureClass,
    context: input.context,
  });
  store.set(experience.id, experience);
  if (experience.missionId) {
    const set = byMission.get(experience.missionId) ?? new Set<string>();
    set.add(experience.id);
    byMission.set(experience.missionId, set);
  }
  return experience;
}

export function listExperiences(filter?: {
  missionId?: string;
  capability?: string;
  since?: string;
  onlyFailures?: boolean;
}): ReadonlyArray<Experience> {
  const all = Array.from(store.values());
  return all.filter((exp) => {
    if (filter?.missionId && exp.missionId !== filter.missionId) return false;
    if (filter?.capability && exp.capability !== filter.capability) return false;
    if (filter?.since && exp.capturedAt < filter.since) return false;
    if (filter?.onlyFailures && exp.success) return false;
    return true;
  });
}

export function getExperience(id: string): Experience | null {
  return store.get(id) ?? null;
}

export function buildLearningCase(
  experiences: ReadonlyArray<Experience>,
  mode: LearningMode,
  title: string,
): LearningCase {
  if (experiences.length === 0) {
    throw new Error("Cannot build learning case from empty experience set");
  }
  return {
    id: nextId("case"),
    title,
    experiences,
    createdAt: new Date().toISOString(),
    mode,
  };
}

export function experienceCount(): number {
  return store.size;
}
