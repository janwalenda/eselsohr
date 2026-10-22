import type { H3Event } from "h3";
import { parseIcon, serializeIcon } from "~~/shared/icons";
import { getPage } from "../../../../../utils/nc-collectives";
import { writePageIcon } from "../../../../../utils/page-icons-write";

function getNumericRouteParam(event: H3Event, key: string) {
  const value = Number(getRouterParam(event, key));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` });
  }

  return value;
}

export default defineEventHandler(async (event) => {
  const collectiveId = getNumericRouteParam(event, "collectiveId");

  const pageId = getNumericRouteParam(event, "pageId");

  const body = await readBody<{ icon?: string | null }>(event);

  const parsed = parseIcon(body.icon);

  const icon = parsed ? serializeIcon(parsed) : null;

  const page = await getPage(event, collectiveId, pageId);

  const result = await writePageIcon(event, collectiveId, page, icon);

  return {
    icon: result.icon,
    pageId: page.id,
  };
});
