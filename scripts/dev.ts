import { watch, type FSWatcher } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const workspace = process.cwd();
const nextBinary = path.join(workspace, "node_modules", ".bin", "next");
const nextProcess = spawn(
  nextBinary,
  ["dev", ...process.argv.slice(2)],
  {
    cwd: workspace,
    env: process.env,
    stdio: "inherit",
  },
);

let debounceTimer: NodeJS.Timeout | undefined;
let generationRunning = false;
let generationQueued = false;
const watchers: FSWatcher[] = [];

function generateKnowledge() {
  if (generationRunning) {
    generationQueued = true;
    return;
  }

  generationRunning = true;
  const generator = spawn(
    process.execPath,
    ["scripts/generate-denver-knowledge.ts"],
    {
      cwd: workspace,
      env: process.env,
      stdio: "inherit",
    },
  );
  generator.on("exit", () => {
    generationRunning = false;
    if (generationQueued) {
      generationQueued = false;
      generateKnowledge();
    }
  });
}

function scheduleKnowledgeGeneration(filename: string | null) {
  if (
    !filename?.endsWith(".tsx") ||
    filename.includes(`${path.sep}denver${path.sep}`) ||
    filename.includes(`${path.sep}assistant${path.sep}`)
  ) {
    return;
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generateKnowledge, 180);
}

for (const sourceRoot of ["app", "components"]) {
  watchers.push(
    watch(
      path.join(workspace, sourceRoot),
      { recursive: true },
      (_event, filename) => scheduleKnowledgeGeneration(filename),
    ),
  );
}

function stop() {
  if (debounceTimer) clearTimeout(debounceTimer);
  for (const watcher of watchers) watcher.close();
  if (!nextProcess.killed) nextProcess.kill("SIGTERM");
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
nextProcess.on("exit", (code, signal) => {
  for (const watcher of watchers) watcher.close();
  if (debounceTimer) clearTimeout(debounceTimer);
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
