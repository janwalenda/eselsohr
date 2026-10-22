import type { H3Event } from "h3";
import { deletePageShare } from "../../../../../../utils/nc-collectives-shares";
import { deletePublicShareByToken } from "../../../../../../utils/public-shares-db";

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

  const token = getRouterParam(event, "token")?.trim();

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Invalid share token" });
  }

  await deletePageShare(event, collectiveId, pageId, token);
  await deletePublicShareByToken(event, token);

  return { ok: true };
});
