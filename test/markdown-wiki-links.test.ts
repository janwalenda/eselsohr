import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { DOMParser } from "@tiptap/pm/model";
import { buildExtensions } from "../app/lib/nc-text/editor/extensions";
import markdownIt, {
  annotateWikiLinksInHtml,
  renderMarkdownBody,
} from "../app/lib/nc-text/editor/markdownit";
import { serializeMarkdown } from "../app/lib/nc-text/editor/markdown-serializer";

describe("markdown wiki links", () => {
  it("renders wiki links to data-wiki-link anchors", () => {
    const html = markdownIt.render("See [[Three laws of motion|Newton]].");

    expect(html).toContain("data-wiki-link");
    expect(html).toContain('data-wiki-target="Three laws of motion"');
    expect(html).toContain("Newton");
  });

  it("annotates wiki links in html directly", () => {
    const html = '<p><a data-wiki-link data-wiki-target="Alpha" class="wiki-link">Alpha</a></p>';

    const annotated = annotateWikiLinksInHtml(html, [{ id: 1, title: "Alpha" }]);

    expect(annotated).toContain('data-wiki-page-id="1"');
  });

  it("annotates resolved and broken wiki links", () => {
    const html = renderMarkdownBody("[[Alpha]] and [[Missing]]", {
      pages: [{ id: 1, title: "Alpha" }],
    });

    expect(html).toContain('data-wiki-page-id="1"');
    expect(html).toContain("wiki-link--broken");
  });

  it("round-trips wiki links through the editor schema", () => {
    const html = markdownIt.render("Link [[Beta]] here.");

    const schema = getSchema(
      buildExtensions({ editing: false, pages: [{ id: 2, title: "Beta" }] }),
    );

    const container = document.createElement("div");

    container.innerHTML = html;
    const doc = DOMParser.fromSchema(schema).parse(container);

    const markdown = serializeMarkdown(doc);

    expect(markdown).toContain("[[Beta]]");
  });
});
