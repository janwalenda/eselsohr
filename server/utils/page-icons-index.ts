import type { H3Event } from "h3";
import { isLandingPage } from "../../shared/collectives";
import { parseMarkdownFile } from "../../shared/frontmatter";
import { iconFromProperties } from "../../shared/icons";
import { deletePageIcon, upsertPageIcon } from "./page-icons-db";

/**
 * Index the `icon` frontmatter property for a page.
 * Landing pages (`Readme.md`) also write the collective-level row (page_id = 0).
 */
export async function indexPageIconFromMarkdown(
  event: H3Event,
  collectiveId: number,
  pageId: number,
  rawMarkdown: string,
  options?: {
    instanceId?: number;
    /** Skip the getPage call when the caller already knows landing status. */
    isLanding?: boolean;
  },
) {
  try {
    const parsed = parseMarkdownFile(rawMarkdown);

    const icon = iconFromProperties(parsed.properties);

    const landing = options?.isLanding ?? false;

    if (icon) {
      await upsertPageIcon(event, { collectiveId, pageId }, icon, pageId, options?.instanceId);

      if (landing) {
        await upsertPageIcon(event, { collectiveId, pageId: 0 }, icon, pageId, options?.instanceId);
      }

      return;
    }

    await deletePageIcon(event, { collectiveId, pageId }, options?.instanceId);

    if (landing) {
      await deletePageIcon(event, { collectiveId, pageId: 0 }, options?.instanceId);
    }
  } catch (error) {
    // Icon indexing is best-effort; a missing migration must not break saves.
    console.error("[page-icons] indexing failed:", error);
  }
}

/** Index icon and detect landing page from the page metadata. */
export async function indexPageIconForPage(
  event: H3Event,
  collectiveId: number,
  page: Parameters<typeof isLandingPage>[0] & { id: number },
  rawMarkdown: string,
  instanceId?: number,
) {
  await indexPageIconFromMarkdown(event, collectiveId, page.id, rawMarkdown, {
    instanceId,
    isLanding: isLandingPage(page),
  });
}
