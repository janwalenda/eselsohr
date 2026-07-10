import type { H3Event } from "h3";
import { getPage } from "../../../../../../utils/nc-collectives";
import { createTextSession } from "../../../../../../utils/nc-text";
import { getPageDavRelativePath, getPageFileId } from "../../../../../../utils/nc-webdav";

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

  const page = await getPage(event, collectiveId, pageId);

  const fileId = Number(await getPageFileId(event, page));

  const filePath = getPageDavRelativePath(page);

  // Do not pass the WebDAV file ETag as baseVersionEtag. Text keeps its own
  // baseVersionEtag per document session; sending the file ETag makes create fail
  // with HTTP 412 on every page that was edited in Collectives before.
  const openData = await createTextSession(event, {
    fileId,
    filePath,
  });

  return { ...openData, filePath };
});
