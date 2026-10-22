/**
 * Tiptap node for Nextcloud/Collectives callouts (`::: info` ... `:::`). Renders as
 * a `<div data-callout-type>` so it round-trips through {@link markdownit} and the
 * markdown serializer. Types mirror nextcloud/text's callout set.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import type { CalloutType } from "./markdownit";

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info" as CalloutType,
        parseHTML: (element) => element.getAttribute("data-callout-type") ?? "info",
        renderHTML: (attributes) => ({ "data-callout-type": attributes.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout-type]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = (HTMLAttributes as Record<string, string>)["data-callout-type"] ?? "info";

    return ["div", mergeAttributes(HTMLAttributes, { class: `callout callout--${type}` }), 0];
  },
});

export default Callout;
