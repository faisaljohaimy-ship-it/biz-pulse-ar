import type { FollowUpItem } from "./types";

const F = new Map<string, FollowUpItem[]>();

export interface FollowUpInput {
  readonly text_ar: string;
  readonly text_en: string;
  readonly dueBy?: string;
  readonly owner?: string;
}

export function addFollowUp(scope: string, input: FollowUpInput): FollowUpItem {
  const arr = F.get(scope) ?? [];
  const item: FollowUpItem = {
    id: `fu-${arr.length + 1}-${Date.now().toString(36)}`,
    text_ar: input.text_ar.trim(),
    text_en: input.text_en.trim(),
    dueBy: input.dueBy,
    owner: input.owner,
    status: "open",
  };
  if (!item.text_ar || !item.text_en) throw new Error("follow-up must be bilingual");
  arr.push(item);
  F.set(scope, arr);
  return item;
}

export function updateFollowUpStatus(scope: string, id: string, status: FollowUpItem["status"]): void {
  const arr = F.get(scope);
  if (!arr) return;
  const i = arr.findIndex((x) => x.id === id);
  if (i >= 0) { arr[i] = { ...arr[i], status }; F.set(scope, arr); }
}

export function listFollowUps(scope: string): readonly FollowUpItem[] {
  return F.get(scope) ?? [];
}

export function pendingFollowUps(scope: string): readonly FollowUpItem[] {
  return (F.get(scope) ?? []).filter((f) => f.status === "open" || f.status === "in_progress");
}
