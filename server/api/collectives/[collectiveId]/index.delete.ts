import type { H3Event } from "h3";
import { trashCollective } from "../../../utils/nc-collectives";

function getCollectiveId(event: H3Event) {
  const value = Number(getRouterParam(event, "collectiveId"));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid collective ID" });
  }

  return value;
}

export default defineEventHandler(async (event) => {
  const collectiveId = getCollectiveId(event);

  const collective = await trashCollective(event, collectiveId);

  return { collective };
});
