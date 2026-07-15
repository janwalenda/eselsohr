import type { CollectivePage } from "./collectives";
import type { PageProperties } from "./properties";
import { extractWikiLinkTargets, normalizeWikiLinkTarget } from "./wiki-links";

export type GraphPageNode = {
  id: number;
  title: string;
  kind: "page";
  val: number;
};

export type GraphBrokenNode = {
  id: string;
  title: string;
  kind: "broken";
  val: number;
};

export type GraphNode = GraphPageNode | GraphBrokenNode;

export type GraphLink = {
  source: number | string;
  target: number | string;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type GraphMode = "links" | "folder";

function brokenNodeId(normalizedTitle: string) {
  return `broken:${normalizedTitle}`;
}

export function computeNodeVal(adjacencyCount: number) {
  return Math.max(1, adjacencyCount);
}

function collectAliases(properties: PageProperties | undefined) {
  const aliases: string[] = [];

  const rawAliases = properties?.aliases;

  if (typeof rawAliases === "string" && rawAliases.trim()) {
    aliases.push(rawAliases.trim());
  }

  if (Array.isArray(rawAliases)) {
    for (const entry of rawAliases) {
      const alias = String(entry).trim();

      if (alias) {
        aliases.push(alias);
      }
    }
  }

  return aliases;
}

function buildTitleLookup(
  pages: CollectivePage[],
  propertiesByPageId: Map<number, PageProperties>,
) {
  const lookup = new Map<string, CollectivePage>();

  for (const page of pages) {
    const keys = [page.title, ...collectAliases(propertiesByPageId.get(page.id))];

    for (const key of keys) {
      const normalized = normalizeWikiLinkTarget(key);

      if (!normalized || lookup.has(normalized)) {
        continue;
      }

      lookup.set(normalized, page);
    }
  }

  return lookup;
}

function applyNodeDegrees(nodes: Map<number | string, GraphNode>, links: GraphLink[]) {
  const degrees = new Map<number | string, Set<number | string>>();

  for (const node of nodes.values()) {
    degrees.set(node.id, new Set());
  }

  for (const link of links) {
    degrees.get(link.source)?.add(link.target);
    degrees.get(link.target)?.add(link.source);
  }

  for (const [nodeId, neighbors] of degrees) {
    const node = nodes.get(nodeId);

    if (node) {
      node.val = computeNodeVal(neighbors.size);
    }
  }
}

export function buildFolderGraph(pages: CollectivePage[]): GraphData {
  const nodes = new Map<number | string, GraphNode>();

  const links: GraphLink[] = [];

  const pageIds = new Set(pages.map((page) => page.id));

  for (const page of pages) {
    nodes.set(page.id, {
      id: page.id,
      title: page.title,
      kind: "page",
      val: 1,
    });
  }

  for (const page of pages) {
    if (!pageIds.has(page.parentId)) {
      continue;
    }

    links.push({
      source: page.parentId,
      target: page.id,
    });
  }

  applyNodeDegrees(nodes, links);

  return {
    nodes: [...nodes.values()],
    links,
  };
}

export function buildLinkGraph(
  pages: CollectivePage[],
  pageBodies: Map<number, string>,
  propertiesByPageId: Map<number, PageProperties> = new Map(),
): GraphData {
  const nodes = new Map<number | string, GraphNode>();

  const links: GraphLink[] = [];

  const titleLookup = buildTitleLookup(pages, propertiesByPageId);

  for (const page of pages) {
    nodes.set(page.id, {
      id: page.id,
      title: page.title,
      kind: "page",
      val: 1,
    });
  }

  for (const page of pages) {
    const body = pageBodies.get(page.id) ?? "";

    const targets = extractWikiLinkTargets(body);

    for (const target of targets) {
      const normalized = normalizeWikiLinkTarget(target);

      const resolved = titleLookup.get(normalized);

      if (resolved) {
        links.push({
          source: page.id,
          target: resolved.id,
        });
        continue;
      }

      const brokenId = brokenNodeId(normalized);

      if (!nodes.has(brokenId)) {
        nodes.set(brokenId, {
          id: brokenId,
          title: target.trim(),
          kind: "broken",
          val: 1,
        });
      }

      links.push({
        source: page.id,
        target: brokenId,
      });
    }
  }

  applyNodeDegrees(nodes, links);

  return {
    nodes: [...nodes.values()],
    links,
  };
}
