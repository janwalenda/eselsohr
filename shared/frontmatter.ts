import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { PageProperties } from "./properties";

export type ParsedMarkdownFile = {
  properties: PageProperties;
  body: string;
};

const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

function normalizeFrontmatterValue(value: unknown): PageProperties[string] {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  return String(value);
}

function mergeTagAliases(data: Record<string, unknown>) {
  const properties: PageProperties = {};

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.trim();

    if (!normalizedKey) {
      continue;
    }

    if (normalizedKey === "tag" || normalizedKey === "tags") {
      const existing = properties.tags;

      const next = normalizeFrontmatterValue(value);

      if (Array.isArray(existing) && Array.isArray(next)) {
        properties.tags = [...existing, ...next];
        continue;
      }

      if (Array.isArray(existing) && typeof next === "string") {
        properties.tags = [...existing, next];
        continue;
      }

      if (typeof existing === "string" && Array.isArray(next)) {
        properties.tags = [existing, ...next];
        continue;
      }

      properties.tags = next;
      continue;
    }

    if (normalizedKey === "alias") {
      properties.aliases = normalizeFrontmatterValue(value);
      continue;
    }

    if (normalizedKey === "cssclass") {
      properties.cssclasses = normalizeFrontmatterValue(value);
      continue;
    }

    properties[normalizedKey] = normalizeFrontmatterValue(value);
  }

  return properties;
}

function parseFrontmatterData(yamlSource: string): Record<string, unknown> {
  const parsed = parseYaml(yamlSource);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed as Record<string, unknown>;
}

export function parseMarkdownFile(raw: string): ParsedMarkdownFile {
  const source = raw ?? "";

  if (!source.trim()) {
    return { properties: {}, body: "" };
  }

  const match = source.match(FRONTMATTER_RE);

  if (!match) {
    return { properties: {}, body: source };
  }

  try {
    const data = parseFrontmatterData(match[1]);

    return {
      properties: mergeTagAliases(data),
      body: match[2].replace(/^\n/, ""),
    };
  } catch {
    return { properties: {}, body: source };
  }
}

export function composeMarkdownFile(properties: PageProperties, body: string) {
  const normalizedBody = body ?? "";

  const entries = Object.entries(properties).filter(([key]) => key.trim());

  if (entries.length === 0) {
    return normalizedBody;
  }

  const data = Object.fromEntries(entries);

  const yamlBlock = stringifyYaml(data).trimEnd();

  return `---\n${yamlBlock}\n---\n${normalizedBody}`;
}
