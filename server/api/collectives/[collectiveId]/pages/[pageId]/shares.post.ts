import type { H3Event } from "h3";
import { buildPublicShareUrl } from "../../../../../../shared/public-shares";
import { createPageShare } from "../../../../../utils/nc-collectives-shares";
import { getActiveSession } from "../../../../../utils/nc-session";
import { insertPublicShare, upsertNcInstance } from "../../../../../utils/public-shares-db";

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

  const session = await getActiveSession(event);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "No active Nextcloud session" });
  }

  const share = await createPageShare(event, collectiveId, pageId);

  const instanceId = await upsertNcInstance(event, session.ncUrl);

  await insertPublicShare(event, {
    token: share.token,
    instanceId,
    collectiveId,
    pageId,
    createdBy: session.loginName,
  });

  const config = useRuntimeConfig(event);

  return {
    share: {
      ...share,
      url: buildPublicShareUrl(config.public.siteUrl, {
        token: share.token,
        pageId,
      }),
    },
  };
});
