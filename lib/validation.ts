export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringValue(
  value: unknown,
  maximumLength = 2_000,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maximumLength) : undefined;
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function parseGroqJson(response: unknown): JsonObject {
  if (!isJsonObject(response) || !Array.isArray(response.choices)) {
    throw new Error("The AI service returned an invalid response.");
  }

  const firstChoice = response.choices[0];
  if (!isJsonObject(firstChoice) || !isJsonObject(firstChoice.message)) {
    throw new Error("The AI service returned an invalid response.");
  }

  const content = stringValue(firstChoice.message.content, 100_000);
  if (!content) {
    throw new Error("The AI service returned an empty response.");
  }

  const parsed: unknown = JSON.parse(content);
  if (!isJsonObject(parsed)) {
    throw new Error("The AI service returned an invalid JSON object.");
  }
  return parsed;
}
