import type { H3Event } from "h3";
import { parseIcon, serializeIcon } from "~~/shared/icons";
import { createPage, getPage } from "../../../utils/nc-collectives";
import { writePageIcon } from "../../../utils/page-icons-write";

function getCollectiveId(event: H3Event) {
  const value = Number(getRouterParam(event, "collectiveId"));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid collective ID" });
  }

  return value;
}

export default defineEventHandler(async (event) => {
  const collectiveId = getCollectiveId(event);

  const body = await readBody<{ title?: string; parentId?: number; icon?: string | null }>(event);

  const title = body.title?.trim();

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: "A title is required" });
  }

  const parsed = parseIcon(body.icon);

  const icon = parsed ? serializeIcon(parsed) : null;

  const page = await createPage(event, collectiveId, {
    title,
    parentId: body.parentId,
    icon,
  });

  if (icon) {
    try {
      const freshPage = await getPage(event, collectiveId, page.id);

      await writePageIcon(event, collectiveId, freshPage, icon);
      page.icon = icon;
    } catch (error) {
      console.error("[page-icons] failed to write page icon after create:", error);
    }
  }

  return { page };
});
