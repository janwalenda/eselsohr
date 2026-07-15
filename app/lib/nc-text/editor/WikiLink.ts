/**
 * Inline wiki link node for Obsidian-style `[[Page Title]]` / `[[Target|Label]]` syntax.
 */

import { InputRule, Node, mergeAttributes } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { CollectivePage } from "~~/shared/collectives";
import { resolveWikiLinkTarget, wikiLinkDisplayLabel } from "~~/shared/wiki-links";
import { findWikiLinkSuggestionMatch } from "./wiki-link-suggestion-match";

export type WikiLinkSuggestionItem = Pick<CollectivePage, "id" | "title">;

export type WikiLinkPage = Pick<CollectivePage, "id" | "title">;

export interface WikiLinkOptions {
  collectiveId: number;
  pages: WikiLinkPage[];
  HTMLAttributes: Record<string, unknown>;
  enableSuggestion: boolean;
  suggestion: Partial<
    Omit<SuggestionOptions<WikiLinkSuggestionItem, WikiLinkSuggestionItem>, "editor">
  >;
}

export const WikiLinkPluginKey = new PluginKey("wikiLinkSuggestion");

function wikiLinkClasses(target: string, pages: WikiLinkPage[]) {
  const resolved = resolveWikiLinkTarget(target, pages);

  return resolved ? "wiki-link" : "wiki-link wiki-link--broken";
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addOptions() {
    return {
      collectiveId: 0,
      pages: [],
      HTMLAttributes: {},
      enableSuggestion: false,
      suggestion: {
        pluginKey: WikiLinkPluginKey,
        char: "[",
        allowSpaces: true,
        allowedPrefixes: null,
        items: ({ query, editor }) => {
          const wikiLinkExtension = editor.extensionManager.extensions.find(
            (extension) => extension.name === "wikiLink",
          );

          const pages = (wikiLinkExtension?.options as WikiLinkOptions | undefined)?.pages ?? [];

          const normalizedQuery = query.trim().toLowerCase();

          return pages
            .filter(
              (page) => !normalizedQuery || page.title.toLowerCase().includes(normalizedQuery),
            )
            .slice(0, 20);
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, {
              type: "wikiLink",
              attrs: {
                target: props.title,
                label: null,
              },
            })
            .run();
        },
      },
    };
  },

  addAttributes() {
    return {
      target: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-wiki-target"),
        renderHTML: (attributes) => ({
          "data-wiki-target": attributes.target,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-wiki-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }

          return {
            "data-wiki-label": attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-wiki-link]" }, { tag: "span[data-wiki-link]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const target = String(node.attrs.target ?? "");

    const label = node.attrs.label ? String(node.attrs.label) : null;

    const pages = this.options.pages;

    const resolved = resolveWikiLinkTarget(target, pages);

    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-wiki-link": "",
        class: wikiLinkClasses(target, pages),
        ...(resolved ? { "data-wiki-page-id": String(resolved.id) } : {}),
      }),
      wikiLinkDisplayLabel({ target, label: label ?? undefined }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const renderLink = () => {
        const { pages } = this.options;

        const target = String(node.attrs.target ?? "");

        const label = node.attrs.label ? String(node.attrs.label) : null;

        const resolved = resolveWikiLinkTarget(target, pages);

        element.setAttribute("data-wiki-target", target);

        if (label) {
          element.setAttribute("data-wiki-label", label);
        } else {
          element.removeAttribute("data-wiki-label");
        }

        if (resolved) {
          element.setAttribute("data-wiki-page-id", String(resolved.id));
        } else {
          element.removeAttribute("data-wiki-page-id");
        }

        element.className = wikiLinkClasses(target, pages);
        element.textContent = wikiLinkDisplayLabel({ target, label: label ?? undefined });
      };

      const element = document.createElement("span");

      element.setAttribute("data-wiki-link", "");
      element.setAttribute("role", "link");
      element.setAttribute("tabindex", "0");
      renderLink();

      return {
        dom: element,
        update(updatedNode) {
          if (updatedNode.type.name !== "wikiLink") {
            return false;
          }

          node = updatedNode;
          renderLink();
          return true;
        },
      };
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]$/,
        handler: ({ chain, range, match }) => {
          const target = match[1]?.trim() ?? "";

          if (!target) {
            return null;
          }

          const label = match[2]?.trim() || null;

          chain()
            .insertContentAt(range, {
              type: this.name,
              attrs: { target, label },
            })
            .run();
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    if (!this.options.enableSuggestion) {
      return [];
    }

    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        findSuggestionMatch: findWikiLinkSuggestionMatch,
      }),
    ];
  },
});

export default WikiLink;
