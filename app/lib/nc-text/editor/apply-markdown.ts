/**
 * Apply markdown content to an existing collaborative Yjs document, used when
 * switching from source mode back to the rich-text editor.
 */

import { getSchema } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { DOMParser } from "@tiptap/pm/model";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import type { Doc } from "yjs";
import { XmlFragment } from "yjs";
import { parseMarkdownFile } from "~~/shared/frontmatter";
import { buildExtensions } from "./extensions";
import markdownit from "./markdownit";

export const APPLY_MARKDOWN_ORIGIN = "apply-markdown";

export function markdownToProseMirrorNode(content: string): ProseMirrorNode {
  const body = parseMarkdownFile(content).body;

  const html = `${markdownit.render(body)} `;

  const schema = getSchema(buildExtensions({ editing: false }));

  const container = window.document.createElement("div");

  container.innerHTML = html;
  return DOMParser.fromSchema(schema).parse(container);
}

export function applyMarkdownToYdoc(ydoc: Doc, content: string) {
  const fragment = ydoc.get("default", XmlFragment) as XmlFragment;

  if (!fragment.doc) {
    return;
  }

  ydoc.transact(() => {
    while (fragment.length > 0) {
      fragment.delete(0, 1);
    }

    if (content?.trim()) {
      const node = markdownToProseMirrorNode(content);

      prosemirrorToYXmlFragment(node, fragment);
    }
  }, APPLY_MARKDOWN_ORIGIN);
}
