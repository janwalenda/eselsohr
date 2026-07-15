import type { PageProperties } from "./properties";

const INLINE_TAG_PATTERN = /(?:^|(?<=\s))#([\p{L}\p{N}_/-]+)/gu;

export function normalizeTag(raw: string) {
  return raw.trim().replace(/^#/, "").toLowerCase();
}

function collectFrontmatterTags(properties: PageProperties) {
  const tags = new Set<string>();

  const rawTags = properties.tags ?? properties.tag;

  if (typeof rawTags === "string" && rawTags.trim()) {
    tags.add(normalizeTag(rawTags));
  }

  if (Array.isArray(rawTags)) {
    for (const entry of rawTags) {
      const normalized = normalizeTag(String(entry));

      if (normalized) {
        tags.add(normalized);
      }
    }
  }

  return tags;
}

function stripCodeRegions(markdown: string) {
  let stripped = markdown.replace(/```[\s\S]*?```/g, (block) => " ".repeat(block.length));

  stripped = stripped.replace(/`[^`\n]+`/g, (block) => " ".repeat(block.length));

  return stripped;
}

export function extractInlineTags(body: string) {
  const tags = new Set<string>();

  const searchable = stripCodeRegions(body ?? "");

  for (const match of searchable.matchAll(INLINE_TAG_PATTERN)) {
    const normalized = normalizeTag(match[1] ?? "");

    if (normalized) {
      tags.add(normalized);
    }
  }

  return [...tags];
}

export function collectPageTags(properties: PageProperties, body: string) {
  const tags = collectFrontmatterTags(properties);

  for (const tag of extractInlineTags(body)) {
    tags.add(tag);
  }

  return [...tags].sort();
}
