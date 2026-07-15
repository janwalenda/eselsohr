import { describe, expect, it } from "vitest";
import { extractWikiLinkTargets, normalizeWikiLinkTarget } from "../shared/wiki-links";

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
