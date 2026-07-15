import { describe, expect, it } from "vitest";
import {
  extractWikiLinks,
  extractWikiLinkTargets,
  normalizeWikiLinkTarget,
  parseWikiLink,
  resolveWikiLinkTarget,
  serializeWikiLink,
  wikiLinkDisplayLabel,
} from "../shared/wiki-links";

describe("parseWikiLink", () => {
  it("parses a simple wiki link", () => {
    expect(parseWikiLink("[[Three laws of motion]]")).toEqual({
      target: "Three laws of motion",
    });
  });

  it("parses a wiki link with display label", () => {
    expect(parseWikiLink("[[Three laws of motion|Newton]]")).toEqual({
      target: "Three laws of motion",
      label: "Newton",
    });
  });

  it("returns null for invalid input", () => {
    expect(parseWikiLink("[not a wiki link]")).toBeNull();
    expect(parseWikiLink("[[|empty target]]")).toBeNull();
  });
});

describe("serializeWikiLink", () => {
  it("serializes a simple wiki link", () => {
    expect(serializeWikiLink({ target: "Foo" })).toBe("[[Foo]]");
  });

  it("serializes a wiki link with a distinct label", () => {
    expect(serializeWikiLink({ target: "Foo", label: "Bar" })).toBe("[[Foo|Bar]]");
  });

  it("omits label when it matches the target", () => {
    expect(serializeWikiLink({ target: "Foo", label: "Foo" })).toBe("[[Foo]]");
  });
});

describe("extractWikiLinks", () => {
  it("extracts wiki links from markdown", () => {
    const body = "See [[Page A]] and [[Page B|Alias]].";

    expect(extractWikiLinks(body)).toEqual([
      { target: "Page A" },
      { target: "Page B", label: "Alias" },
    ]);
  });

  it("ignores wiki links inside code blocks", () => {
    const body = "```\n[[Hidden]]\n```\n[[Visible]]";

    expect(extractWikiLinks(body)).toEqual([{ target: "Visible" }]);
  });
});

describe("resolveWikiLinkTarget", () => {
  const pages = [
    { id: 1, title: "Alpha" },
    { id: 2, title: "Beta" },
  ];

  it("resolves by exact title match", () => {
    expect(resolveWikiLinkTarget("Beta", pages)).toEqual({ id: 2, title: "Beta" });
  });

  it("returns null when no page matches", () => {
    expect(resolveWikiLinkTarget("Missing", pages)).toBeNull();
  });
});

describe("wikiLinkDisplayLabel", () => {
  it("prefers the label over the target", () => {
    expect(wikiLinkDisplayLabel({ target: "Target", label: "Label" })).toBe("Label");
  });

  it("falls back to the target", () => {
    expect(wikiLinkDisplayLabel({ target: "Target" })).toBe("Target");
  });
});

describe("normalizeWikiLinkTarget", () => {
  it("trims and lowercases titles", () => {
    expect(normalizeWikiLinkTarget("  Rezepte  ")).toBe("rezepte");
  });
});

describe("extractWikiLinkTargets", () => {
  it("extracts basic wiki links", () => {
    expect(extractWikiLinkTargets("See [[Gulasch]] and [[Käsekuchen]]")).toEqual([
      "Gulasch",
      "Käsekuchen",
    ]);
  });

  it("extracts aliased and heading wiki links", () => {
    expect(
      extractWikiLinkTargets("[[Rezepte|All recipes]] and [[Weißweinkuchen#Zutaten]]"),
    ).toEqual(["Rezepte", "Weißweinkuchen"]);
  });

  it("ignores wiki links inside fenced and inline code", () => {
    const body = [
      "See [[Gulasch]]",
      "",
      "```",
      "[[Not a link]]",
      "```",
      "",
      "Use `[[Also not a link]]` here.",
    ].join("\n");

    expect(extractWikiLinkTargets(body)).toEqual(["Gulasch"]);
  });
});
