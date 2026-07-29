import { loadConfig } from "./config";
import { CompetitorWorker } from "./worker";

async function main() {
  const worker = new CompetitorWorker(await loadConfig());
  const stop = () => worker.stop();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  await worker.run();
}

main().catch((error) => {
  console.error(
    "Competitor worker stopped:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
