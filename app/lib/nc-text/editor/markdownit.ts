/**
 * markdown-it instance used to parse on-disk markdown into HTML that Tiptap can
 * load (initial seeding of a fresh document and markdown paste). Modeled on
 * nextcloud/text's `src/markdownit/index.js`, trimmed to the feature set the
 * Eselsohr editor currently renders. Callout containers map the Collectives
 * `::: type` blocks onto `<div data-callout-type>` so the Callout node parses them.
 */

import MarkdownIt from "markdown-it";
import type { CollectivePage } from "~~/shared/collectives";
import { resolveWikiLinkTarget } from "~~/shared/wiki-links";
import taskLists from "markdown-it-task-lists";
import container from "markdown-it-container";

const WIKI_LINK_INLINE_PATTERN = /^\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/;

export const CALLOUT_TYPES = ["info", "warn", "error", "success", "tip"] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

const CALLOUT_ALIASES: Record<string, CalloutType> = {
  info: "info",
  warn: "warn",
  warning: "warn",
  error: "error",
  danger: "error",
  success: "success",
  tip: "tip",
};

export function normalizeCalloutType(raw: string): CalloutType {
  return CALLOUT_ALIASES[raw.trim().toLowerCase()] ?? "info";
}

const md = new MarkdownIt("default", {
  html: false,
  linkify: true,
  breaks: false,
});

md.use(taskLists, { enabled: true, label: true });

// Register one container per accepted callout keyword (incl. aliases) so that
// `::: warning` and `::: warn` both render as a warn callout.
for (const keyword of Object.keys(CALLOUT_ALIASES)) {
  md.use(container, keyword, {
    validate: (params: string) => params.trim().toLowerCase() === keyword,
    render(tokens: { nesting: number }[], idx: number) {
      if (tokens[idx].nesting === 1) {
        const type = normalizeCalloutType(keyword);

        return `<div class="callout callout--${type}" data-callout-type="${type}">\n`;
      }

      return "</div>\n";
    },
  });
}

function wikiLinkInlineRule(
  state: {
    src: string;
    pos: number;
    posMax: number;
    push: (
      type: string,
      tag: string,
      nesting: number,
    ) => {
      attrs: [string, string][];
      content: string;
      markup: string;
    };
  },
  silent: boolean,
) {
  if (state.src.charCodeAt(state.pos) !== 0x5b /* [ */) {
    return false;
  }

  if (state.pos + 1 >= state.posMax || state.src.charCodeAt(state.pos + 1) !== 0x5b) {
    return false;
  }

  const match = WIKI_LINK_INLINE_PATTERN.exec(state.src.slice(state.pos));

  if (!match) {
    return false;
  }

  if (!silent) {
    const target = match[1]?.trim() ?? "";

    const label = match[3]?.trim() || target;

    const token = state.push("wiki_link", "a", 0);

    token.attrs = [
      ["data-wiki-link", ""],
      ["data-wiki-target", target],
    ];

    if (match[3]?.trim()) {
      token.attrs.push(["data-wiki-label", match[3].trim()]);
    }

    token.content = label;
    token.markup = match[0];
  }

  state.pos += match[0].length;
  return true;
}

md.inline.ruler.before("link", "wiki_link", wikiLinkInlineRule);

md.renderer.rules.wiki_link = (tokens, idx) => {
  const token = tokens[idx];

  const target = token.attrGet("data-wiki-target") ?? "";

  const labelAttr = token.attrGet("data-wiki-label");

  const label = labelAttr || token.content || target;

  let attrs = `data-wiki-link data-wiki-target="${md.utils.escapeHtml(target)}" class="wiki-link"`;

  if (labelAttr) {
    attrs += ` data-wiki-label="${md.utils.escapeHtml(labelAttr)}"`;
  }

  return `<a ${attrs}>${md.utils.escapeHtml(label)}</a>`;
};

type WikiLinkPage = Pick<CollectivePage, "id" | "title">;

export function annotateWikiLinksInHtml(html: string, pages: WikiLinkPage[] = []) {
  if (!pages.length) {
    return html;
  }

  return html.replace(/<a\s([^>]*?)>([^<]*)<\/a>/g, (match, attrs, label) => {
    if (!attrs.includes("data-wiki-target")) {
      return match;
    }

    const targetMatch = /data-wiki-target="([^"]*)"/.exec(attrs);

    if (!targetMatch) {
      return match;
    }

    const target = targetMatch[1] ?? "";

    const resolved = resolveWikiLinkTarget(target, pages);

    const classes = resolved ? "wiki-link" : "wiki-link wiki-link--broken";

    const pageIdAttr = resolved ? ` data-wiki-page-id="${resolved.id}"` : "";

    const cleaned = attrs
      .replace(/\s*class="[^"]*"/, "")
      .replace(/\s*data-wiki-page-id="[^"]*"/, "")
      .trim();

    return `<a ${cleaned} class="${classes}"${pageIdAttr}>${label}</a>`;
  });
}

export function renderMarkdownBody(body: string, options?: { pages?: WikiLinkPage[] }) {
  const html = md.render(body);

  if (!options?.pages?.length) {
    return html;
  }

  return annotateWikiLinksInHtml(html, options.pages);
}

export default md;
