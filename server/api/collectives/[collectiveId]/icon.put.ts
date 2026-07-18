import type { H3Event } from "h3";
import { findLandingPage, flattenPageTree, validateCollectiveEmoji } from "~~/shared/collectives";
import { parseIcon, serializeIcon } from "~~/shared/icons";
import { getPage, listPageTree, updateCollectiveEmoji } from "../../../utils/nc-collectives";
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

  const body = await readBody<{ icon?: string | null }>(event);

  const parsed = parseIcon(body.icon);

  const icon = parsed ? serializeIcon(parsed) : null;

  const tree = await listPageTree(event, collectiveId);

  const landing = findLandingPage(flattenPageTree(tree));

  if (!landing) {
    throw createError({ statusCode: 404, statusMessage: "Collective landing page not found" });
  }

  const page = await getPage(event, collectiveId, landing.id);

  const result = await writePageIcon(event, collectiveId, page, icon);

  // Best-effort sync to Nextcloud emoji field when the icon is a valid NC emoji.
  if (parsed?.kind === "emoji") {
    const validation = validateCollectiveEmoji(parsed.value);

    if (validation.valid) {
      try {
        await updateCollectiveEmoji(event, collectiveId, parsed.value);
      } catch (error) {
        console.error("[page-icons] NC emoji sync failed:", error);
      }
    }
  } else if (icon === null) {
    try {
      await updateCollectiveEmoji(event, collectiveId, null);
    } catch {
      // ignore
    }
  }

  return {
    icon: result.icon,
    iconOwnerPageId: page.id,
    pageId: page.id,
  };
});
