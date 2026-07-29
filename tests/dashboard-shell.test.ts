import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboardShell = readFileSync(
  new URL("../components/dashboard/DashboardShell.tsx", import.meta.url),
  "utf8",
);
const dashboardUi = readFileSync(
  new URL("../lib/dashboard-ui.ts", import.meta.url),
  "utf8",
);

function test(name: string, run: () => void) {
  run();
  console.log(`✓ ${name}`);
}

test("keeps dashboard header regions in non-overlapping grid tracks", () => {
  assert.match(
    dashboardShell,
    /md:grid-cols-\[minmax\(0,1fr\)_minmax\(12rem,2\.5fr\)_auto\]/,
  );
  assert.match(
    dashboardShell,
    /className="hidden min-w-0 justify-center md:flex"/,
  );
  assert.doesNotMatch(
    dashboardShell,
    /className="pointer-events-none absolute inset-x-4 hidden justify-center/,
  );

  assert.match(dashboardUi, /flex h-9 w-full max-w-224 min-w-0/);
  assert.doesNotMatch(dashboardUi, /calc\(100vw-20rem\)/);
});
