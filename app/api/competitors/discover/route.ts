export async function POST() {
  return Response.json(
    {
      error:
        "This speculative endpoint was replaced by evidence-backed competitor research.",
      replacement: "/api/competitors/research",
    },
    { status: 410 },
  );
}
