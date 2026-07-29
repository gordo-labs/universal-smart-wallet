import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const graphPath = join(projectRoot, "working/orchestration/task-graph.json");
const graph = JSON.parse(await readFile(graphPath, "utf8"));
const taskDir = join(projectRoot, graph.generatedTaskDocs);

await mkdir(taskDir, { recursive: true });

const list = (items) => items.map((item) => `- ${item}`).join("\n");
const inline = (items) => (items.length ? items.map((item) => `\`${item}\``).join(", ") : "None");

for (const task of graph.tasks) {
  const filename = `${task.id}-${task.slug}.md`;
  const dependencies = task.dependsOn.length ? task.dependsOn.join(", ") : "None";
  const externalWrite = task.externalWrite
    ? "\n> This task includes external writes. Confirm explicit owner authorization immediately before performing them.\n"
    : "";
  const prompt = `# ${task.id} — ${task.title}

> Generated from \`working/orchestration/task-graph.json\`. Edit the graph and rerun \`node scripts/render-task-prompts.mjs\`.

| Field | Value |
| --- | --- |
| Status | ${task.status} |
| Priority | ${task.priority} |
| Wave | ${task.wave} |
| Lane | ${task.lane} |
| Dependencies | ${dependencies} |
| Primary paths | ${inline(task.touchPaths)} |
${externalWrite}
## Active feature context

${list(task.featureDocs)}

## Objective

${task.objective}

## Deliverables

${list(task.deliverables)}

## Non-goals

${list(task.nonGoals)}

## Acceptance criteria

${task.acceptance.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Expected failure handling

${list(task.failureModes)}

## Validation mapped to acceptance

${task.validation.map((item, index) => `${index + 1}. \`${item}\``).join("\n")}

## Agent prompt

\`\`\`text
Implement ${task.id}: ${task.title}.

Project: sovereign-smart-wallet
Objective: ${task.objective}

Mandatory start:
1. Read AGENTS.md, PROJECT.json, STATUS.md, DOCS-MAP.md, working/BACKLOG.md, and this complete task document.
2. Read these active feature/context documents: ${task.featureDocs.join(", ")}.
3. Run git status --short --branch before editing. If unrelated work exists, do not clean, overwrite, or include it; use an isolated worktree or ask for direction.
4. Confirm these dependencies are merged: ${dependencies}.
5. Work only on ${task.id} in an atomic branch. Primary owned paths: ${task.touchPaths.join(", ")}.
${task.externalWrite ? "6. This task performs external writes. Reconfirm explicit owner authorization before creating, pushing, publishing, or changing remote state." : ""}

Deliver:
${task.deliverables.map((item) => `- ${item}`).join("\n")}

Do not include:
${task.nonGoals.map((item) => `- ${item}`).join("\n")}

Acceptance criteria:
${task.acceptance.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Error and security behavior:
${task.failureModes.map((item) => `- ${item}`).join("\n")}
- Use synthetic credentials only, local Anvil or explicitly configured testnets only, and no real PII or valuable assets.
- Do not implement cryptographic primitives or a smart-account base from scratch.
- Do not log or commit credentials, disclosures, vault keys, recovery material, passkey private material, secrets, or production endpoints.
- Keep core tests independent of hosted RPC, bundler, paymaster, issuer, verifier, resolver, and trust-registry services.

Validation:
${task.validation.map((item, index) => `${index + 1}. Run ${item} and map the result to acceptance criterion ${Math.min(index + 1, task.acceptance.length)}.`).join("\n")}
- Add or update at least one automated test for every behavior changed.
- Run the narrow checks first, then the relevant root checks.

Documentation and handoff:
1. Update the owning feature docs, maps, task/backlog status, monthly history, and today's project memory where relevant.
2. Return a pass/fail table for every acceptance criterion, exact commands/results, changed files, mocks/external dependencies, security/privacy implications, and next unblocked task IDs.
3. Do not claim completion if a required check was skipped or blocked.
\`\`\`
`;
  await writeFile(join(taskDir, filename), prompt, "utf8");
}

const backlogRows = graph.tasks
  .map(
    (task) =>
      `| ${task.id} | ${task.status} | ${task.priority} | ${task.lane} | ${task.title} | [task](tasks/${task.id}-${task.slug}.md) |`,
  )
  .join("\n");

const backlog = `# Backlog — Sovereign Smart Wallet

Canonical atomic construction queue. Dependencies and scheduling metadata live
in [task-graph.json](orchestration/task-graph.json).

| ID | Status | Priority | Lane | Title | Detail |
| --- | --- | --- | --- | --- | --- |
${backlogRows}

## Status rules

- \`Todo\`: accepted and not started.
- \`Doing\`: one named branch/agent owns it.
- \`Blocked\`: a concrete unmet dependency or authority gate is recorded.
- \`Done\`: acceptance and validation evidence are recorded.
- \`Dropped\`: decision and replacement, if any, are recorded.
`;

await writeFile(join(projectRoot, "working/BACKLOG.md"), backlog, "utf8");

const promptRows = graph.tasks
  .map((task) => `- [${task.id} — ${task.title}](../../working/tasks/${task.id}-${task.slug}.md)`)
  .join("\n");
const catalogPath = join(projectRoot, "working/orchestration/PROMPT-CATALOG.md");
const currentCatalog = await readFile(catalogPath, "utf8");
const marker = "\n## Generated task links\n";
const baseCatalog = currentCatalog.includes(marker) ? currentCatalog.split(marker)[0] : currentCatalog.trimEnd();
await writeFile(catalogPath, `${baseCatalog}${marker}\n${promptRows}\n`, "utf8");

const generatedFiles = (await readdir(taskDir))
  .filter((name) => /^SSW-\d{3}-.*\.md$/.test(name))
  .sort();

console.log(
  JSON.stringify(
    {
      graph: relative(projectRoot, graphPath),
      tasks: graph.tasks.length,
      taskDocs: generatedFiles.length,
      backlog: "working/BACKLOG.md",
    },
    null,
    2,
  ),
);
