import { describe, expect, it } from "vitest";
import type { CollectivePage } from "../shared/collectives";
import { buildFolderGraph, buildLinkGraph, computeNodeVal } from "../shared/graph";

function page(
  overrides: Partial<CollectivePage> & Pick<CollectivePage, "id" | "title">,
): CollectivePage {
  return {
    emoji: null,
    parentId: 0,
    subpageOrder: [],
    timestamp: 0,
    size: 0,
    fileName: `${overrides.title}.md`,
    filePath: "",
    collectivePath: "Collectives/Test",
    isFullWidth: false,
    ...overrides,
  };
}

describe("computeNodeVal", () => {
  it("never returns less than 1", () => {
    expect(computeNodeVal(0)).toBe(1);
    expect(computeNodeVal(3)).toBe(3);
  });
});

describe("buildFolderGraph", () => {
  it("connects parents to direct children and sizes by degree", () => {
    const pages = [
      page({ id: 1, title: "Root", parentId: 0 }),
      page({ id: 2, title: "Child A", parentId: 1 }),
      page({ id: 3, title: "Child B", parentId: 1 }),
      page({ id: 4, title: "Grandchild", parentId: 2 }),
    ];

    const graph = buildFolderGraph(pages);

    expect(graph.nodes).toHaveLength(4);
    expect(graph.links).toEqual([
      { source: 1, target: 2 },
      { source: 1, target: 3 },
      { source: 2, target: 4 },
    ]);

    const root = graph.nodes.find((node) => node.id === 1);

    const childA = graph.nodes.find((node) => node.id === 2);

    expect(root?.val).toBe(2);
    expect(childA?.val).toBe(2);
  });
});

describe("buildLinkGraph", () => {
  it("resolves wiki links and creates broken nodes", () => {
    const pages = [page({ id: 1, title: "Rezepte" }), page({ id: 2, title: "Gulasch" })];

    const bodies = new Map<number, string>([[1, "See [[Gulasch]] and [[Missing Page]]"]]);

    const graph = buildLinkGraph(pages, bodies);

    expect(graph.links).toEqual([
      { source: 1, target: 2 },
      { source: 1, target: "broken:missing page" },
    ]);

    const broken = graph.nodes.find((node) => node.kind === "broken");

    expect(broken).toMatchObject({
      id: "broken:missing page",
      title: "Missing Page",
      kind: "broken",
    });
  });

  it("resolves aliases from frontmatter", () => {
    const pages = [page({ id: 1, title: "Recipes" }), page({ id: 2, title: "Gulasch" })];

    const bodies = new Map<number, string>([[1, "See [[Rezepte]]"]]);

    const properties = new Map([[2, { aliases: ["Rezepte"] }]]);

    const graph = buildLinkGraph(pages, bodies, properties);

    expect(graph.links).toEqual([{ source: 1, target: 2 }]);
  });
});
