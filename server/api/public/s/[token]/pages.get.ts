import { attachPageIcons, buildPageTree } from "../../../../utils/nc-collectives";
import { listPublicPages } from "../../../../utils/nc-collectives-public";
import { getCollectiveIconsMap } from "../../../../utils/page-icons-db";
import { getPublicShareMapping, withPublicShareCleanup } from "../../../../utils/public-shares";
import { upsertNcInstance } from "../../../../utils/public-shares-db";

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token")?.trim();

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Invalid share token" });
  }

  const share = await getPublicShareMapping(event, token);
  const pages = await withPublicShareCleanup(event, token, async () => {
    const rawPages = await listPublicPages(share.ncUrl, token);

    try {
      const instanceId = await upsertNcInstance(event, share.ncUrl);
      const icons = await getCollectiveIconsMap(event, share.collectiveId, instanceId);

      return buildPageTree(attachPageIcons(rawPages, icons));
    } catch (error) {
      console.error("[page-icons] failed to load public page icons:", error);
      return buildPageTree(rawPages);
    }
  });

  return {
    share,
    pages,
  };
});
