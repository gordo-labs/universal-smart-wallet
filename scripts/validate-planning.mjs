import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const graph = JSON.parse(
  await readFile(join(projectRoot, "working/orchestration/task-graph.json"), "utf8"),
);
const errors = [];
const tasks = new Map(graph.tasks.map((task) => [task.id, task]));

for (const task of graph.tasks) {
  for (const dependency of task.dependsOn) {
    const dependencyTask = tasks.get(dependency);
    if (!dependencyTask) {
      errors.push(`${task.id} has unknown dependency ${dependency}`);
    } else if (dependencyTask.wave >= task.wave) {
      errors.push(
        `${task.id} wave ${task.wave} does not follow ${dependency} wave ${dependencyTask.wave}`,
      );
    }
  }
}

const visiting = new Set();
const visited = new Set();
function visit(id) {
  if (visiting.has(id)) {
    errors.push(`Dependency cycle includes ${id}`);
    return;
  }
  if (visited.has(id)) return;
  visiting.add(id);
  for (const dependency of tasks.get(id)?.dependsOn ?? []) visit(dependency);
  visiting.delete(id);
  visited.add(id);
}
for (const id of tasks.keys()) visit(id);

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== ".git") {
      files.push(...(await markdownFiles(path)));
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      files.push(path);
    }
  }
  return files;
}

for (const file of await markdownFiles(projectRoot)) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (
      rawTarget.startsWith("http://") ||
      rawTarget.startsWith("https://") ||
      rawTarget.startsWith("#") ||
      rawTarget.startsWith("../../")
    ) {
      continue;
    }
    const targetWithoutAnchor = rawTarget.split("#")[0];
    if (!targetWithoutAnchor) continue;
    const target = resolve(dirname(file), targetWithoutAnchor);
    try {
      await access(target);
    } catch {
      errors.push(`${file}: missing link target ${rawTarget}`);
    }
  }
}

for (const task of graph.tasks) {
  const taskPath = join(
    projectRoot,
    graph.generatedTaskDocs,
    `${task.id}-${task.slug}.md`,
  );
  try {
    await access(taskPath);
  } catch {
    errors.push(`Missing generated task document ${taskPath}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        tasks: graph.tasks.length,
        dependencies: graph.tasks.reduce(
          (total, task) => total + task.dependsOn.length,
          0,
        ),
        markdownLinks: "ok",
        dependencyGraph: "acyclic",
      },
      null,
      2,
    ),
  );
}
