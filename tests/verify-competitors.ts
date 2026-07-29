import { POST as discoverPOST } from "../app/api/competitors/discover/route";
import { POST as movesPOST } from "../app/api/competitors/moves/route";

async function testCompetitorRadarVerification() {
  console.log("=== Testing Competitor Auto-Discover & Moves Radar ===");

  // 1. Test Auto-Discovery
  const discoverReq = new Request("http://localhost:3000/api/competitors/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: "Aura Glow Skincare",
      industry: "Fashion & beauty",
      targetAudience: "Gen Z & Millennials",
    }),
  });

  const discoverRes = await discoverPOST(discoverReq);
  const discoverData = await discoverRes.json();

  console.log("Auto-Discover Status:", discoverRes.status);
  console.log("Competitors Found:", discoverData.competitors?.length);
  if (discoverData.competitors?.length > 0) {
    console.log("Sample Discovered Rival:", discoverData.competitors[0]);
  }

  // 2. Test Moves Radar
  const movesReq = new Request("http://localhost:3000/api/competitors/moves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      competitorName: "Rival Labs",
      primaryAngle: "Price-slash video montage",
    }),
  });

  const movesRes = await movesPOST(movesReq);
  const movesData = await movesRes.json();

  console.log("\nMoves Radar Status:", movesRes.status);
  console.log("Moves Detected:", movesData.moves?.length);
  if (movesData.moves?.length > 0) {
    console.log("Sample Competitor Move:", movesData.moves[0]);
  }
}

testCompetitorRadarVerification();
