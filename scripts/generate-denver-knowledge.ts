import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const workspace = process.cwd();
const outputPath = path.join(
  workspace,
  "lib",
  "generated",
  "denver-knowledge.json",
);
const generatorVersion = 2;
const sourceRoots = ["app", "components"];
const excludedPathParts = new Set(["assistant", "denver"]);
const visibleAttributeNames = new Set([
  "alt",
  "aria-label",
  "body",
  "description",
  "label",
  "placeholder",
  "subtitle",
  "title",
]);
const visiblePropertyNames = new Set([
  "body",
  "content",
  "date",
  "description",
  "intentDescription",
  "label",
  "message",
  "name",
  "quote",
  "role",
  "subtitle",
  "text",
  "title",
]);
const userMessageSetters = new Set([
  "setError",
  "setMessage",
  "setStatus",
  "setSuccess",
]);

type KnowledgeChunk = {
  id: string;
  area: string;
  source: string;
  route?: string;
  text: string[];
};

type DashboardTab = {
  id: string;
  label: string;
};

type KnowledgeFile = {
  version: 2;
  sourceHash: string;
  routes: string[];
  dashboardTabs: DashboardTab[];
  chunks: KnowledgeChunk[];
};

async function findTsxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (excludedPathParts.has(entry.name)) return [];
        return findTsxFiles(absolutePath);
      }
      return entry.isFile() && entry.name.endsWith(".tsx")
        ? [absolutePath]
        : [];
    }),
  );
  return files.flat();
}

function normalizedSourcePath(absolutePath: string) {
  return path.relative(workspace, absolutePath).split(path.sep).join("/");
}

function routeFromPage(source: string) {
  if (!source.startsWith("app/") || !source.endsWith("/page.tsx")) {
    return undefined;
  }

  const segments = source
    .slice("app/".length, -"/page.tsx".length)
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function humanAreaName(source: string) {
  const parts = source.split("/");
  const filename = parts.at(-1) ?? source;
  const base =
    filename === "page.tsx"
      ? parts.at(-2) ?? "Home"
      : filename.replace(/\.tsx$/, "");
  if (base === "app") return "Home";
  return base
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function propertyName(node: ts.PropertyName | ts.JsxAttributeName) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) {
    return node.text;
  }
  return "";
}

function staticText(node: ts.Node | undefined): string | null {
  if (
    node &&
    (ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isJsxText(node))
  ) {
    return node.text;
  }
  return null;
}

function normalizeText(raw: string) {
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHumanCopy(value: string) {
  if (!/[a-z]/i.test(value) || value.length < 2) return false;
  if (/^(?:https?:|\/|@\/|#[0-9a-f]{3,8}$)/i.test(value)) return false;
  if (
    /\b(?:flex|grid|rounded|border-|bg-|text-|px-|py-|mx-|my-|mt-|mb-|gap-|items-|justify-|hover:|sm:|md:|lg:)\b/.test(
      value,
    )
  ) {
    return false;
  }
  return /\s/.test(value) || /^[A-Z]/.test(value);
}

function collectVisibleText(sourceFile: ts.SourceFile) {
  const collected: string[] = [];
  const seen = new Set<string>();

  function add(raw: string | null, explicit = true) {
    if (raw === null) return;
    const normalized = normalizeText(raw);
    if (!normalized || (!explicit && !looksLikeHumanCopy(normalized))) return;

    const parts =
      normalized.length > 240
        ? normalized.split(/(?<=[.!?])\s+/)
        : [normalized];
    for (const part of parts) {
      const text = part.trim();
      if (
        text.length < 2 ||
        text.length > 240 ||
        !/[a-z]/i.test(text) ||
        seen.has(text)
      ) {
        continue;
      }
      seen.add(text);
      collected.push(text);
    }
  }

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      add(node.text);
    } else if (ts.isJsxAttribute(node)) {
      const name = propertyName(node.name);
      if (visibleAttributeNames.has(name)) {
        if (node.initializer && ts.isStringLiteral(node.initializer)) {
          add(node.initializer.text);
        } else if (
          node.initializer &&
          ts.isJsxExpression(node.initializer)
        ) {
          add(staticText(node.initializer.expression));
        }
      }
    } else if (
      ts.isPropertyAssignment(node) &&
      visiblePropertyNames.has(propertyName(node.name))
    ) {
      add(staticText(node.initializer));
    } else if (ts.isCallExpression(node)) {
      const callee = ts.isIdentifier(node.expression)
        ? node.expression.text
        : "";
      if (userMessageSetters.has(callee)) {
        for (const argument of node.arguments) {
          add(staticText(argument));
        }
      }
    } else if (
      ts.isStringLiteral(node) &&
      ts.isArrayLiteralExpression(node.parent)
    ) {
      add(node.text, false);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return collected.slice(0, 100);
}

function collectDashboardTabs(sourceFile: ts.SourceFile) {
  const tabs: DashboardTab[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "tabs" &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const element of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        let id = "";
        let label = "";
        for (const property of element.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const name = propertyName(property.name);
          const value = staticText(property.initializer) ?? "";
          if (name === "id") id = value;
          if (name === "label") label = value;
        }
        if (id && label) tabs.push({ id, label });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return tabs;
}

const absoluteFiles = (
  await Promise.all(
    sourceRoots.map((root) => findTsxFiles(path.join(workspace, root))),
  )
)
  .flat()
  .sort();

const hash = createHash("sha256");
hash.update(`generator:${generatorVersion}\0`);
const chunks: KnowledgeChunk[] = [];
const routes = new Set<string>();
let dashboardTabs: DashboardTab[] = [];

for (const absolutePath of absoluteFiles) {
  const source = normalizedSourcePath(absolutePath);
  const content = await readFile(absolutePath, "utf8");
  hash.update(source);
  hash.update("\0");
  hash.update(content);
  hash.update("\0");

  const sourceFile = ts.createSourceFile(
    source,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const route = routeFromPage(source);
  if (route) routes.add(route);

  if (source.endsWith("components/dashboard/DashboardShell.tsx")) {
    dashboardTabs = collectDashboardTabs(sourceFile);
  }

  const text = collectVisibleText(sourceFile);
  if (text.length > 0) {
    chunks.push({
      id: source.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase(),
      area: humanAreaName(source),
      source,
      ...(route ? { route } : {}),
      text,
    });
  }
}

const knowledge: KnowledgeFile = {
  version: generatorVersion,
  sourceHash: hash.digest("hex").slice(0, 16),
  routes: [...routes].sort(),
  dashboardTabs,
  chunks,
};
const output = `${JSON.stringify(knowledge, null, 2)}\n`;

await mkdir(path.dirname(outputPath), { recursive: true });
let current = "";
try {
  current = await readFile(outputPath, "utf8");
} catch {
  // The first generation creates the file.
}

if (current !== output) {
  await writeFile(outputPath, output, "utf8");
  console.log(
    `Denver knowledge updated: ${knowledge.routes.length} routes, ${knowledge.chunks.length} areas, revision ${knowledge.sourceHash}`,
  );
} else {
  console.log(`Denver knowledge is current: revision ${knowledge.sourceHash}`);
}
