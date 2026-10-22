export type ParsedPageSearchQuery = {
  titleQuery: string;
  tag: string | null;
};

const TAG_TOKEN_PATTERN = /(?:^|\s)tags:([^\s]+)/i;

export function parsePageSearchQuery(input: string): ParsedPageSearchQuery {
  const source = input.trim();

  const match = source.match(TAG_TOKEN_PATTERN);

  if (!match) {
    return {
      titleQuery: source,
      tag: null,
    };
  }

  const tag = match[1]?.replace(/^#/, "").trim().toLowerCase() || null;

  const titleQuery = source.replace(TAG_TOKEN_PATTERN, " ").replace(/\s+/g, " ").trim();

  return {
    titleQuery,
    tag,
  };
}
