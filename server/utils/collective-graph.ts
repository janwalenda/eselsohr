import type { H3Event } from "h3";
import { flattenPageTree } from "../../shared/collectives";
import type { GraphMode } from "../../shared/graph";
import { buildFolderGraph, buildLinkGraph } from "../../shared/graph";
import { parseMarkdownFile } from "../../shared/frontmatter";
import type { PageProperties } from "../../shared/properties";
import { listPageTree } from "./nc-collectives";
import { readPageContent } from "./nc-webdav";

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = new Array(items.length);

  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;

      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

  return results;
}

async function readPageBodies(event: H3Event, pages: ReturnType<typeof flattenPageTree>) {
  const entries = await mapWithConcurrency(pages, 8, async (page) => {
    try {
      const rawContent = await readPageContent(event, page);

      const parsed = parseMarkdownFile(rawContent.content);

      return {
        pageId: page.id,
        body: parsed.body,
        properties: parsed.properties,
      };
    } catch {
      return {
        pageId: page.id,
        body: "",
        properties: {} satisfies PageProperties,
      };
    }
  });

  const bodies = new Map<number, string>();

  const propertiesByPageId = new Map<number, PageProperties>();

  for (const entry of entries) {
    bodies.set(entry.pageId, entry.body);
    propertiesByPageId.set(entry.pageId, entry.properties);
  }

  return { bodies, propertiesByPageId };
}

export async function buildCollectiveGraph(event: H3Event, collectiveId: number, mode: GraphMode) {
  const tree = await listPageTree(event, collectiveId);

  const pages = flattenPageTree(tree);

  if (mode === "folder") {
    return {
      mode,
      ...buildFolderGraph(pages),
    };
  }

  const { bodies, propertiesByPageId } = await readPageBodies(event, pages);

  return {
    mode,
    ...buildLinkGraph(pages, bodies, propertiesByPageId),
  };
}
