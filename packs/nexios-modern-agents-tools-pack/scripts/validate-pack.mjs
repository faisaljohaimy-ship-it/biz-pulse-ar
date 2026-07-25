import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const agentsRegistry = JSON.parse(await fs.readFile(path.join(root, "registry/agents.registry.json"), "utf8"));
const toolsRegistry = JSON.parse(await fs.readFile(path.join(root, "registry/tools.registry.json"), "utf8"));
const errors = [];

if (agentsRegistry.count !== 72 || agentsRegistry.agents.length !== 72) {
  errors.push("Agent count mismatch.");
}
if (toolsRegistry.count !== 180 || toolsRegistry.tools.length !== 180) {
  errors.push("Tool count mismatch.");
}

const agentIds = new Set();
const toolIds = new Set(toolsRegistry.tools.map((tool) => tool.id));
const skillRegistry = JSON.parse(
  await fs.readFile(path.join(root, "bindings/skills.snapshot.json"), "utf8")
);
const skillIds = new Set(skillRegistry.skillIds);

for (const tool of toolsRegistry.tools) {
  if (tool.enabled !== false || tool.implementationStatus !== "descriptor_only") {
    errors.push(`Unsafe tool default: ${tool.id}`);
  }
  if (["write", "action", "admin"].includes(tool.operation) && !tool.approvalRequired) {
    errors.push(`Side effect without approval: ${tool.id}`);
  }
  if (tool.inputSchema?.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    errors.push(`Input schema dialect missing: ${tool.id}`);
  }
  if (tool.outputSchema?.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    errors.push(`Output schema dialect missing: ${tool.id}`);
  }
  const filePath = path.join(root, "tools", `${tool.id}.json`);
  try {
    const fileTool = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (fileTool.id !== tool.id) errors.push(`Tool file mismatch: ${tool.id}`);
  } catch {
    errors.push(`Missing or invalid tool file: ${tool.id}`);
  }
}

for (const agent of agentsRegistry.agents) {
  if (agentIds.has(agent.id)) errors.push(`Duplicate agent: ${agent.id}`);
  agentIds.add(agent.id);
  if (agent.enabled !== false || agent.implementationStatus !== "descriptor_only") {
    errors.push(`Unsafe agent default: ${agent.id}`);
  }
  for (const toolId of agent.toolAllowlist) {
    if (!toolIds.has(toolId)) errors.push(`Unknown tool ${toolId} on ${agent.id}`);
  }
  for (const skillId of agent.skills) {
    if (!skillIds.has(skillId)) errors.push(`Unknown skill ${skillId} on ${agent.id}`);
  }
  const filePath = path.join(root, "agents", `${agent.id}.json`);
  try {
    const fileAgent = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (fileAgent.id !== agent.id) errors.push(`Agent file mismatch: ${agent.id}`);
  } catch {
    errors.push(`Missing or invalid agent file: ${agent.id}`);
  }
}

const combinedText = JSON.stringify({ agentsRegistry, toolsRegistry });
if (/\b(TODO|TBD|FIXME)\b/.test(combinedText)) errors.push("Placeholder marker found.");
if (/(sk-[A-Za-z0-9]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|password\s*[:=]\s*[^" ]+)/i.test(combinedText)) {
  errors.push("Potential secret material found.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`72 agents and 180 tools validated; bindings, schemas, approvals, safe defaults, and files are consistent.`);
