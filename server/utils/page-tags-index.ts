import type { H3Event } from "h3";
import { parseMarkdownFile } from "../../shared/frontmatter";
import { collectPageTags } from "../../shared/tags";
import { replacePageTags } from "./page-tags-db";

export async function indexPageTagsFromMarkdown(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  rawMarkdown: string,
) {
  try {
    const parsed = parseMarkdownFile(rawMarkdown);

    const tags = collectPageTags(parsed.properties, parsed.body);

    await replacePageTags(event, { collectiveId, pageId }, tags);
  } catch (error) {
    // Tag indexing is best-effort; a missing migration must not break saves.
    console.error("[page-tags] indexing failed:", error);
  }
}
