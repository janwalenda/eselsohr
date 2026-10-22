import type { H3Event } from "h3";
import { deleteCollectiveShare } from "../../../../utils/nc-collectives-shares";
import { deletePublicShareByToken } from "../../../../utils/public-shares-db";

function getCollectiveId(event: H3Event) {
  const value = Number(getRouterParam(event, "collectiveId"));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid collective ID" });
  }

  return value;
}

export default defineEventHandler(async (event) => {
  const collectiveId = getCollectiveId(event);

  const token = getRouterParam(event, "token")?.trim();

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Invalid share token" });
  }

  await deleteCollectiveShare(event, collectiveId, token);
  await deletePublicShareByToken(event, token);

  return { ok: true };
});
