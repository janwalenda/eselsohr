import { describe, expect, it } from "vitest";
import { composeMarkdownFile, parseMarkdownFile } from "../shared/frontmatter";

describe("parseMarkdownFile", () => {
  it("returns empty properties for markdown without frontmatter", () => {
    expect(parseMarkdownFile("# Hello")).toEqual({
      properties: {},
      body: "# Hello",
    });
  });

  it("parses yaml frontmatter and body", () => {
    const parsed = parseMarkdownFile(`---
tags:
  - journal
status: draft
---
# Title
`);

    expect(parsed.properties).toEqual({
      tags: ["journal"],
      status: "draft",
    });
    expect(parsed.body).toBe("# Title\n");
  });

  it("merges deprecated tag aliases into tags", () => {
    const parsed = parseMarkdownFile(`---
tag: old
tags:
  - journal
---
Body
`);

    expect(parsed.properties.tags).toEqual(["old", "journal"]);
  });
  it("round-trips an icon frontmatter property", () => {
    const source = `---
icon: lucide:folder-open
tags:
  - notes
---
# Hello
`;

    const parsed = parseMarkdownFile(source);

    expect(parsed.properties.icon).toBe("lucide:folder-open");

    const composed = composeMarkdownFile(parsed.properties, parsed.body);

    const reparsed = parseMarkdownFile(composed);

    expect(reparsed.properties.icon).toBe("lucide:folder-open");
    expect(reparsed.properties.tags).toEqual(["notes"]);
  });
});

describe("composeMarkdownFile", () => {
  it("round-trips frontmatter and body", () => {
    const source = `---
tags:
  - journal
aliases:
  - "Meeting Notes"
---
# Hello
`;

    const parsed = parseMarkdownFile(source);

    const composed = composeMarkdownFile(parsed.properties, parsed.body);

    const reparsed = parseMarkdownFile(composed);

    expect(reparsed.properties).toEqual(parsed.properties);
    expect(reparsed.body.trim()).toBe(parsed.body.trim());
  });

  it("returns body only when there are no properties", () => {
    expect(composeMarkdownFile({}, "# Hello")).toBe("# Hello");
  });
});
