import { describe, expect, it } from "vitest";
import { collectPageTags, extractInlineTags, normalizeTag } from "../shared/tags";
import { parsePageSearchQuery } from "../shared/search-query";

describe("normalizeTag", () => {
  it("lowercases and strips leading hash", () => {
    expect(normalizeTag("#Journal")).toBe("journal");
  });
});

describe("extractInlineTags", () => {
  it("extracts inline tags from markdown body", () => {
    expect(extractInlineTags("Notes about #journal and #projekt/idee")).toEqual([
      "journal",
      "projekt/idee",
    ]);
  });

  it("ignores tags inside fenced and inline code", () => {
    const body = [
      "Notes about #journal",
      "",
      "```",
      "#not-a-tag",
      "```",
      "",
      "Use `#also-not-a-tag` here.",
    ].join("\n");

    expect(extractInlineTags(body)).toEqual(["journal"]);
  });
});

describe("collectPageTags", () => {
  it("merges frontmatter and inline tags", () => {
    expect(
      collectPageTags(
        {
          tags: ["Draft", "journal"],
        },
        "Meeting notes #meeting",
      ),
    ).toEqual(["draft", "journal", "meeting"]);
  });
});

describe("parsePageSearchQuery", () => {
  it("parses tag-only queries", () => {
    expect(parsePageSearchQuery("tags:journal")).toEqual({
      titleQuery: "",
      tag: "journal",
    });
  });

  it("parses combined title and tag queries", () => {
    expect(parsePageSearchQuery("meeting tags:draft")).toEqual({
      titleQuery: "meeting",
      tag: "draft",
    });
  });
});
