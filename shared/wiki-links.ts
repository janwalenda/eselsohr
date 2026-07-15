const WIKI_LINK_PATTERN = /\[\[([^\]|#]+?)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

function stripCodeRegions(markdown: string) {
  let stripped = markdown.replace(/```[\s\S]*?```/g, (block) => " ".repeat(block.length));

  stripped = stripped.replace(/`[^`\n]+`/g, (block) => " ".repeat(block.length));

  return stripped;
}

export function normalizeWikiLinkTarget(title: string) {
  return title.trim().toLocaleLowerCase();
}

export function extractWikiLinkTargets(body: string) {
  const targets: string[] = [];

  const searchable = stripCodeRegions(body ?? "");

  for (const match of searchable.matchAll(WIKI_LINK_PATTERN)) {
    const target = match[1]?.trim();

    if (target) {
      targets.push(target);
    }
  }

  return targets;
}
