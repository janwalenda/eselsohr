import type { SuggestionMatch } from "@tiptap/suggestion";

type WikiLinkSuggestionTrigger = {
  $position: {
    pos: number;
    nodeBefore: { isText: boolean; text: string } | null;
  };
};

export function findWikiLinkSuggestionMatch(config: WikiLinkSuggestionTrigger): SuggestionMatch {
  const text = config.$position.nodeBefore?.isText ? config.$position.nodeBefore.text : "";

  if (!text) {
    return null;
  }

  const match = /\[\[([^\]]*)$/.exec(text);

  if (!match) {
    return null;
  }

  const from = config.$position.pos - match[0].length;

  const to = config.$position.pos;

  return {
    range: { from, to },
    query: match[1] ?? "",
    text: match[0],
  };
}
