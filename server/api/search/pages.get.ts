import { getQuery } from "h3";
import { listCollectives, listPages } from "../../utils/nc-collectives";
import { searchPagesByTag } from "../../utils/page-tags-db";

function isMissingPageTagsTable(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes('relation "page_tags" does not exist') ||
      (error as { code?: string }).code === "42P01")
  );
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const tag = String(query.tag ?? "")
    .trim()
    .toLowerCase();

  const titleQuery = String(query.q ?? "")
    .trim()
    .toLowerCase();

  if (!tag) {
    throw createError({ statusCode: 400, statusMessage: "tag query parameter is required" });
  }

  let matches: Awaited<ReturnType<typeof searchPagesByTag>>;

  try {
    matches = await searchPagesByTag(event, tag, titleQuery);
  } catch (error) {
    if (isMissingPageTagsTable(error)) {
      return { results: [] };
    }

    throw error;
  }

  const collectives = await listCollectives(event);

  const collectiveNames = new Map(
    collectives.map((collective) => [collective.id, collective.name]),
  );

  const matchesByCollective = new Map<number, typeof matches>();

  for (const match of matches) {
    const bucket = matchesByCollective.get(match.collectiveId) ?? [];

    bucket.push(match);
    matchesByCollective.set(match.collectiveId, bucket);
  }

  const results: Array<{
    collectiveId: number;
    collectiveName: string;
    pageId: number;
    title: string;
    tags: string[];
  }> = [];

  for (const [collectiveId, collectiveMatches] of matchesByCollective) {
    const pages = await listPages(event, collectiveId);

    const pageById = new Map(pages.map((page) => [page.id, page]));

    for (const match of collectiveMatches) {
      const page = pageById.get(match.pageId);

      const title = page?.title ?? `Seite ${match.pageId}`;

      if (titleQuery && !title.toLowerCase().includes(titleQuery)) {
        continue;
      }

      results.push({
        collectiveId,
        collectiveName: collectiveNames.get(collectiveId) ?? `Collective ${collectiveId}`,
        pageId: match.pageId,
        title,
        tags: match.tags,
      });
    }
  }

  results.sort((left, right) => {
    const collectiveCompare = left.collectiveName.localeCompare(right.collectiveName);

    if (collectiveCompare !== 0) {
      return collectiveCompare;
    }

    return left.title.localeCompare(right.title);
  });

  return { results };
});
