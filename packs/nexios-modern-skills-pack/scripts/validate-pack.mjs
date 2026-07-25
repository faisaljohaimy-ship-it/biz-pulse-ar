import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const registry = JSON.parse(await fs.readFile(path.join(root, "registry/skills.registry.json"), "utf8"));
const errors = [];

if (registry.counts.skills !== 144) errors.push("Registry count is not 144.");
if (registry.skills.length !== 144) errors.push("Registry array length is not 144.");

const ids = new Set();
for (const skill of registry.skills) {
  if (ids.has(skill.id)) errors.push(`Duplicate skill id: ${skill.id}`);
  ids.add(skill.id);
  if (!/^nx-[a-z0-9-]+$/.test(skill.id) || skill.id.length > 64) {
    errors.push(`Invalid skill id: ${skill.id}`);
  }
  if (skill.enabled !== false) errors.push(`Skill must default disabled: ${skill.id}`);
  const filePath = path.join(root, skill.path);
  let content = "";
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    errors.push(`Missing SKILL.md: ${skill.path}`);
    continue;
  }
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter) {
    errors.push(`Missing YAML frontmatter: ${skill.id}`);
    continue;
  }
  const keys = frontmatter[1]
    .split("\n")
    .map((line) => line.split(":")[0].trim())
    .filter(Boolean)
    .sort();
  if (keys.join(",") !== "description,name") {
    errors.push(`Frontmatter may contain only name and description: ${skill.id}`);
  }
  if (!frontmatter[1].includes(`name: ${skill.id}`)) {
    errors.push(`Frontmatter name mismatch: ${skill.id}`);
  }
  if (/\b(TODO|TBD|FIXME)\b/.test(content)) {
    errors.push(`Placeholder marker found: ${skill.id}`);
  }
  const folder = path.basename(path.dirname(filePath));
  if (folder !== skill.id) errors.push(`Folder/name mismatch: ${skill.id}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`144 skills validated; names, frontmatter, registry, defaults, and files are consistent.`);
