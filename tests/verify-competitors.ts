import { POST as discoverPOST } from "../app/api/competitors/discover/route";
import { GET as movesGET } from "../app/api/competitors/moves/route";

async function testCompetitorRadarVerification() {
  console.log("=== Testing Competitor Auto-Discover & Moves Radar ===");

  // 1. Test Auto-Discovery
  const discoverRes = await discoverPOST();
  const discoverData = await discoverRes.json();

  console.log("Legacy discover status:", discoverRes.status);
  console.log("Replacement:", discoverData.replacement);

  // Sourced signals require an authenticated user and a tracked competitor.
  const movesReq = new Request(
    "http://localhost:3000/api/competitors/moves?competitorId=00000000-0000-0000-0000-000000000000",
  );
  const movesRes = await movesGET(movesReq);
  const movesData = await movesRes.json();

  console.log("\nSourced signals status:", movesRes.status);
  console.log("Signals:", movesData.signals?.length ?? 0);
}

testCompetitorRadarVerification();
