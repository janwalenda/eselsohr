/**
 * markdown-it instance used to parse on-disk markdown into HTML that Tiptap can
 * load (initial seeding of a fresh document and markdown paste). Modeled on
 * nextcloud/text's `src/markdownit/index.js`, trimmed to the feature set the
 * Eselsohr editor currently renders. Callout containers map the Collectives
 * `::: type` blocks onto `<div data-callout-type>` so the Callout node parses them.
 */

import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import container from "markdown-it-container";

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

export default md;
