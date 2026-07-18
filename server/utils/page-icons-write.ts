import type { H3Event } from "h3";
import type { CollectivePage } from "../../shared/collectives";
import { composeMarkdownFile, parseMarkdownFile } from "../../shared/frontmatter";
import { parseIcon, serializeIcon } from "../../shared/icons";
import { readPageContent, writePageContent } from "./nc-webdav";
import { indexPageIconForPage } from "./page-icons-index";

/**
 * Set or clear the `icon` frontmatter property on a page, then refresh the index.
 * Pass `null` / empty string to remove the icon.
 */
export async function writePageIcon(
  event: H3Event,
  collectiveId: number,
  page: CollectivePage,
  icon: string | null,
) {
  const parsedIcon = parseIcon(icon);

  const normalized = parsedIcon ? serializeIcon(parsedIcon) : null;

  const { content, etag } = await readPageContent(event, page);

  const parsed = parseMarkdownFile(content);

  const properties = { ...parsed.properties };

  if (normalized) {
    properties.icon = normalized;
  } else {
    delete properties.icon;
  }

  const markdown = composeMarkdownFile(properties, parsed.body);

  const result = await writePageContent(event, page, markdown, etag);

  await indexPageIconForPage(event, collectiveId, page, markdown);

  return {
    icon: normalized,
    etag: result.etag,
  };
}
