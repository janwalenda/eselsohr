import type { H3Event } from "h3";
import { buildPublicShareUrl } from "../../../../shared/public-shares";
import { listCollectiveShares } from "../../../utils/nc-collectives-shares";

function getCollectiveId(event: H3Event) {
  const value = Number(getRouterParam(event, "collectiveId"));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid collective ID" });
  }

  return value;
}

export default defineEventHandler(async (event) => {
  const collectiveId = getCollectiveId(event);

  const config = useRuntimeConfig(event);

  const shares = await listCollectiveShares(event, collectiveId);

  return {
    shares: shares.map((share) => ({
      ...share,
      url: buildPublicShareUrl(config.public.siteUrl, share),
    })),
  };
});
