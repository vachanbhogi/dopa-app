import { POST } from "../app/api/business/auto-discover/route";

async function testAutoDiscoverVerification() {
  console.log("=== Testing /api/business/auto-discover Route ===");

  const mockReq = new Request("http://localhost:3000/api/business/auto-discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      websiteUrl: "https://linear.app",
    }),
  });

  const res = await POST(mockReq);
  const data = await res.json();

  console.log("Status:", res.status);
  console.log("Extracted Profile:");
  console.log(JSON.stringify(data.profile, null, 2));
}

testAutoDiscoverVerification();
