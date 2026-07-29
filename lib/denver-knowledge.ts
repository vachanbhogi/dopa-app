import knowledgeFile from "@/lib/generated/denver-knowledge.json";

type KnowledgeChunk = {
  id: string;
  area: string;
  source: string;
  route?: string;
  text: string[];
};

type DenverKnowledge = {
  version: number;
  sourceHash: string;
  routes: string[];
  dashboardTabs: Array<{ id: string; label: string }>;
  chunks: KnowledgeChunk[];
};

const knowledge = knowledgeFile satisfies DenverKnowledge;
const staticRoutes = knowledge.routes.filter(
  (route) => !route.includes("[") && !route.includes("]"),
);
const dashboardPaths = knowledge.dashboardTabs.map(
  (tab) => `/dashboard?tab=${tab.id}`,
);
const actionLinks = [
  "",
  ...staticRoutes,
  "/?modal=login",
  "/?modal=signup",
  "/#contact",
  ...dashboardPaths,
];

export const DENVER_ACTION_LINKS = [...new Set(actionLinks)].sort();
const actionLinkSet = new Set(DENVER_ACTION_LINKS);
const dashboardPathSet = new Set(dashboardPaths);
const routeSet = new Set(staticRoutes);

const stopWords = new Set([
  "a",
  "about",
  "am",
  "an",
  "and",
  "are",
  "can",
  "do",
  "does",
  "for",
  "from",
  "get",
  "help",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "this",
  "to",
  "what",
  "where",
  "with",
  "you",
]);

function tokenize(value: string) {
  return [
    ...new Set(
      value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .match(/[a-z0-9]{2,}/g)
        ?.filter((token) => !stopWords.has(token)) ?? [],
    ),
  ];
}

function tokenScore(text: string, tokens: string[]) {
  const haystack = text.toLowerCase();
  return tokens.reduce((score, token) => {
    const first = haystack.indexOf(token);
    if (first === -1) return score;
    const repeated = haystack.indexOf(token, first + token.length) !== -1;
    return score + (repeated ? 3 : 2);
  }, 0);
}

function chunkScore(
  chunk: KnowledgeChunk,
  tokens: string[],
  currentPath: string,
) {
  const identity = `${chunk.area} ${chunk.source} ${chunk.route ?? ""}`;
  let score = tokenScore(identity, tokens) * 4;
  score += chunk.text.reduce(
    (total, text) => total + tokenScore(text, tokens),
    0,
  );

  const pathTopic = currentPath
    .replace("/dashboard?tab=", "")
    .replace(/[/?=&-]+/g, " ");
  score += tokenScore(identity, tokenize(pathTopic)) * 5;
  if (chunk.route && currentPath.startsWith(chunk.route)) score += 6;
  return score;
}

function bestText(chunk: KnowledgeChunk, tokens: string[]) {
  const scored = chunk.text.map((text, index) => ({
    text,
    index,
    score: tokenScore(text, tokens),
  }));
  const relevant = scored
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 10);
  const selected = relevant.length > 0 ? relevant : scored.slice(0, 4);
  return selected.map((item) => item.text);
}

export function isDenverActionLink(value: string) {
  return actionLinkSet.has(value);
}

export function normalizeDenverPath(value: string) {
  const url = new URL(value, "https://dopa.local");

  if (url.pathname === "/") {
    const modal = url.searchParams.get("modal");
    return modal === "login" || modal === "signup"
      ? `/?modal=${modal}`
      : "/";
  }

  if (url.pathname === "/dashboard") {
    const tab = url.searchParams.get("tab");
    const dashboardPath = tab ? `/dashboard?tab=${tab}` : "/dashboard";
    return dashboardPathSet.has(dashboardPath)
      ? dashboardPath
      : "/dashboard";
  }

  return routeSet.has(url.pathname) ? url.pathname : "/";
}

export function buildDenverKnowledgeContext(
  conversation: Array<{ content: string }>,
  currentPath: string,
) {
  const recentConversation = conversation
    .slice(-4)
    .map((message) => message.content)
    .join(" ");
  const tokens = tokenize(`${recentConversation} ${currentPath}`);
  const ranked = knowledge.chunks
    .map((chunk) => ({
      chunk,
      score: chunkScore(chunk, tokens, currentPath),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.chunk.source.localeCompare(right.chunk.source),
    );
  const selected = ranked.slice(0, 9).map(({ chunk }) => ({
    ...chunk,
    text: bestText(chunk, tokens),
  }));

  const catalog = knowledge.chunks
    .map((chunk) => {
      const summary = chunk.text.slice(0, 2).join(" ");
      return `- ${chunk.area}: ${summary}`;
    })
    .join("\n");
  const detail = selected
    .map(
      (chunk) =>
        `[${chunk.area} | ${chunk.route ?? chunk.source}]\n${chunk.text
          .map((text) => `- ${text}`)
          .join("\n")}`,
    )
    .join("\n\n");

  return `DENVER WEBSITE KNOWLEDGE
Revision: ${knowledge.sourceHash}
Current page: ${currentPath}
Public routes: ${staticRoutes.join(", ")}
Dashboard sections: ${knowledge.dashboardTabs
    .map((tab) => `${tab.label} (${tab.id})`)
    .join(", ")}

SITE CATALOG
${catalog}

RELEVANT INTERFACE DETAIL
${detail}`;
}

export function denverKnowledgeMetadata() {
  return {
    revision: knowledge.sourceHash,
    routes: [...staticRoutes],
    dashboardTabs: knowledge.dashboardTabs.map((tab) => ({ ...tab })),
    areas: knowledge.chunks.length,
  };
}
