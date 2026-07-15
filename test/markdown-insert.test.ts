import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { XmlFragment } from "yjs";
import {
  applyMarkdownToYdoc,
  markdownToProseMirrorNode,
} from "../app/lib/nc-text/editor/apply-markdown";
import {
  insertAtCursor,
  insertLink,
  prefixLines,
  toggleHeading,
  toggleLinePrefix,
  wrapSelection,
} from "../app/lib/nc-text/editor/markdown-insert";
import { serializeMarkdown } from "../app/lib/nc-text/editor/markdown-serializer";
import { shouldApplySourceMarkdownOnModeSwitch } from "../app/lib/nc-text/editor/source-mode";

function createTextarea(initial = "", start = initial.length, end = initial.length) {
  const textarea = document.createElement("textarea");

  textarea.value = initial;
  textarea.selectionStart = start;
  textarea.selectionEnd = end;
  return textarea;
}

describe("markdown-insert", () => {
  it("wraps the current selection with markers", () => {
    const textarea = createTextarea("Hello world", 6, 11);

    wrapSelection(textarea, "**");
    expect(textarea.value).toBe("Hello **world**");
    expect(textarea.selectionStart).toBe(8);
    expect(textarea.selectionEnd).toBe(13);
  });

  it("inserts text at the cursor", () => {
    const textarea = createTextarea("Hello", 5, 5);

    insertAtCursor(textarea, " world");
    expect(textarea.value).toBe("Hello world");
  });

  it("prefixes all lines in the selection block", () => {
    const textarea = createTextarea("one\ntwo\nthree", 0, 11);

    prefixLines(textarea, "> ");
    expect(textarea.value).toBe("> one\n> two\n> three");
  });

  it("toggles a line prefix on and off", () => {
    const textarea = createTextarea("Heading", 0, 7);

    toggleLinePrefix(textarea, "# ");
    expect(textarea.value).toBe("# Heading");
    toggleLinePrefix(textarea, "# ");
    expect(textarea.value).toBe("Heading");
  });

  it("applies heading prefixes for the selected level", () => {
    const textarea = createTextarea("Title", 0, 5);

    toggleHeading(textarea, 2);
    expect(textarea.value).toBe("## Title");
  });

  it("inserts a markdown link around the selection", () => {
    const textarea = createTextarea("Docs", 0, 4);

    insertLink(textarea, "https://example.com");
    expect(textarea.value).toBe("[Docs](https://example.com)");
  });
});

describe("apply-markdown", () => {
  it("parses markdown into a prose mirror document node", () => {
    const node = markdownToProseMirrorNode("# Hello\n\n**bold**");

    expect(node.textContent).toContain("Hello");
    expect(node.textContent).toContain("bold");
  });

  it("replaces yjs fragment content from markdown", () => {
    const ydoc = new Y.Doc();

    const fragment = ydoc.get("default", XmlFragment) as XmlFragment;

    fragment.insert(0, [new Y.XmlText("stale")]);

    applyMarkdownToYdoc(ydoc, "# Updated title");

    expect(fragment.length).toBeGreaterThan(0);
    const node = markdownToProseMirrorNode("# Updated title");

    expect(node.textContent).toContain("Updated title");
  });

  it("round-trips simple markdown through prose mirror serialization", () => {
    const node = markdownToProseMirrorNode("## Heading\n\nParagraph with **bold**.");

    const markdown = serializeMarkdown(node);

    expect(markdown).toContain("## Heading");
    expect(markdown).toContain("**bold**");
  });
});

describe("source-mode", () => {
  it("does not apply stale source markdown when remote changes arrived", () => {
    expect(shouldApplySourceMarkdownOnModeSwitch(true)).toBe(false);
  });

  it("applies source markdown when no remote staleness was detected", () => {
    expect(shouldApplySourceMarkdownOnModeSwitch(false)).toBe(true);
  });
});
