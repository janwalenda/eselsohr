import type { CollectivePage } from "./collectives";

export type WikiLinkRef = {
  target: string;
  label?: string;
};

const WIKI_LINK_PATTERN = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function parseWikiLink(raw: string): WikiLinkRef | null {
  const match = /^\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]$/.exec(raw.trim());

  if (!match) {
    return null;
  }

  const target = match[1]?.trim() ?? "";

  const label = match[3]?.trim();

  if (!target) {
    return null;
  }

  return label ? { target, label } : { target };
}

export function serializeWikiLink(ref: WikiLinkRef): string {
  const target = ref.target.trim();

  if (!target) {
    return "";
  }

  const label = ref.label?.trim();

  if (label && label !== target) {
    return `[[${target}|${label}]]`;
  }

  return `[[${target}]]`;
}

function stripCodeRegions(markdown: string) {
  let stripped = markdown.replace(/```[\s\S]*?```/g, (block) => " ".repeat(block.length));

  stripped = stripped.replace(/`[^`\n]+`/g, (block) => " ".repeat(block.length));

  return stripped;
}

export function extractWikiLinks(markdown: string): WikiLinkRef[] {
  const links: WikiLinkRef[] = [];

  const searchable = stripCodeRegions(markdown ?? "");

  for (const match of searchable.matchAll(WIKI_LINK_PATTERN)) {
    const target = match[1]?.trim() ?? "";

    const label = match[3]?.trim();

    if (!target) {
      continue;
    }

    links.push(label ? { target, label } : { target });
  }

  return links;
}

export function resolveWikiLinkTarget(
  target: string,
  pages: Pick<CollectivePage, "id" | "title">[],
): Pick<CollectivePage, "id" | "title"> | null {
  const normalizedTarget = target.trim();

  if (!normalizedTarget) {
    return null;
  }

  return pages.find((page) => page.title === normalizedTarget) ?? null;
}

export function wikiLinkDisplayLabel(ref: WikiLinkRef): string {
  return ref.label?.trim() || ref.target.trim();
}

export function isWikiLinkResolved(
  ref: WikiLinkRef,
  pages: Pick<CollectivePage, "id" | "title">[],
): boolean {
  return resolveWikiLinkTarget(ref.target, pages) !== null;
}
