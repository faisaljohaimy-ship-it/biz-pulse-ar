/**
 * NEXIOS modern skill loader.
 * Server-only: do not expose skill instructions or cross-tenant settings to an untrusted client.
 */

export type SupabaseLike = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): any;
    };
  };
};

export type LoadedSkill = {
  id: string;
  name_ar: string;
  name_en: string;
  description: string;
  category: string;
  instructions_md: string;
  tool_allowlist: string[];
  risk_level: "low" | "medium" | "high";
  enabled: boolean;
};

const tokenize = (value: string): Set<string> =>
  new Set(
    value
      .toLocaleLowerCase("ar")
      .normalize("NFKC")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 2)
  );

export function rankSkills(query: string, skills: LoadedSkill[], limit = 8): LoadedSkill[] {
  const queryTokens = tokenize(query);
  return skills
    .map((skill) => {
      const metadataTokens = tokenize(
        [skill.id, skill.name_ar, skill.name_en, skill.description, skill.category].join(" ")
      );
      let score = 0;
      for (const token of queryTokens) {
        if (metadataTokens.has(token)) score += 3;
        if (skill.id.includes(token)) score += 2;
      }
      return { skill, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.skill.id.localeCompare(right.skill.id))
    .slice(0, Math.max(1, Math.min(limit, 12)))
    .map((candidate) => candidate.skill);
}

export async function loadEnabledSkills(
  supabase: SupabaseLike,
  orgId: string
): Promise<LoadedSkill[]> {
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) throw new Error("A valid explicit orgId is required.");

  const response = await supabase
    .from("organization_skill_settings")
    .select(
      "enabled, skill_registry(id,name_ar,name_en,description,category,instructions_md,tool_allowlist,risk_level,enabled)"
    )
    .eq("org_id", orgId)
    .eq("enabled", true);

  if (response.error) throw response.error;

  return (response.data ?? [])
    .map((row: any) => row.skill_registry)
    .filter((skill: LoadedSkill | null): skill is LoadedSkill => Boolean(skill?.enabled));
}

export function buildSkillContext(skills: LoadedSkill[]): {
  instructions: string;
  allowedTools: string[];
} {
  const allowedTools = [...new Set(skills.flatMap((skill) => skill.tool_allowlist))].sort();
  return {
    instructions: skills
      .map((skill) => `## Skill: ${skill.id}\n\n${skill.instructions_md}`)
      .join("\n\n---\n\n"),
    allowedTools
  };
}
