import { emitLearningEvent } from "./events";
import type { KnowledgeArtifact, Lesson } from "./types";

const artifacts = new Map<string, KnowledgeArtifact>();
const byTitle = new Map<string, string>();

function nextId(): string {
  return `kn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toArtifact(lesson: Lesson): KnowledgeArtifact {
  const now = new Date().toISOString();
  const title = `Lesson: ${lesson.statement}`;
  const priorId = byTitle.get(title);
  const prior = priorId ? (artifacts.get(priorId) ?? null) : null;
  const version = prior ? prior.version + 1 : 1;
  const body = [
    `# ${title}`,
    "",
    `**Confidence:** ${(lesson.confidence * 100).toFixed(0)}%`,
    `**Evidence strength:** ${lesson.evidenceStrength}`,
    "",
    "## Rationale",
    lesson.rationale,
    "",
    "## Applies To",
    lesson.appliesTo.length > 0 ? lesson.appliesTo.join(", ") : "generic",
  ].join("\n");
  return {
    id: nextId(),
    version,
    title,
    kind: "lesson",
    body,
    tags: lesson.appliesTo,
    links: [lesson.patternId],
    evidenceIds: lesson.evidenceIds,
    createdAt: prior?.createdAt ?? now,
    updatedAt: now,
    supersedes: prior?.id ?? null,
  };
}

export function publishLesson(lesson: Lesson): KnowledgeArtifact {
  const artifact = toArtifact(lesson);
  artifacts.set(artifact.id, artifact);
  byTitle.set(artifact.title, artifact.id);
  emitLearningEvent("KnowledgeUpdated", {
    artifactId: artifact.id,
    version: artifact.version,
    supersedes: artifact.supersedes,
  });
  return artifact;
}

export function queryKnowledge(query: {
  tag?: string;
  text?: string;
  limit?: number;
}): ReadonlyArray<KnowledgeArtifact> {
  const limit = query.limit ?? 20;
  const q = (query.text ?? "").toLowerCase();
  return Array.from(artifacts.values())
    .filter((a) => {
      if (query.tag && !a.tags.includes(query.tag)) return false;
      if (q && !(a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, limit);
}

export function artifactCount(): number {
  return artifacts.size;
}
