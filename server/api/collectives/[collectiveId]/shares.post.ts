import type { H3Event } from "h3";
import { buildPublicShareUrl } from "../../../../shared/public-shares";
import { createCollectiveShare } from "../../../utils/nc-collectives-shares";
import { getActiveSession } from "../../../utils/nc-session";
import { insertPublicShare, upsertNcInstance } from "../../../utils/public-shares-db";

function getCollectiveId(event: H3Event) {
  const value = Number(getRouterParam(event, "collectiveId"));

  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid collective ID" });
  }

  return value;
}

export default defineEventHandler(async (event) => {
  const collectiveId = getCollectiveId(event);

  const session = await getActiveSession(event);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "No active Nextcloud session" });
  }

  const share = await createCollectiveShare(event, collectiveId);

  const instanceId = await upsertNcInstance(event, session.ncUrl);

  await insertPublicShare(event, {
    token: share.token,
    instanceId,
    collectiveId,
    pageId: null,
    createdBy: session.loginName,
  });

  const config = useRuntimeConfig(event);

  return {
    share: {
      ...share,
      url: buildPublicShareUrl(config.public.siteUrl, share),
    },
  };
});
