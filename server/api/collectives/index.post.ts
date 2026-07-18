import { findLandingPage, flattenPageTree } from "~~/shared/collectives";
import { parseIcon, serializeIcon } from "~~/shared/icons";
import { createCollective, getPage, listPageTree } from "../../utils/nc-collectives";
import { writePageIcon } from "../../utils/page-icons-write";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; emoji?: string | null; icon?: string | null }>(
    event,
  );

  const name = body.name?.trim();

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "A name is required" });
  }

  const iconRaw = body.icon?.trim() || (body.emoji?.trim() ? `emoji:${body.emoji.trim()}` : null);

  const parsed = parseIcon(iconRaw);

  const icon = parsed ? serializeIcon(parsed) : null;

  const collective = await createCollective(event, {
    name,
    icon,
    emoji: body.emoji?.trim() || null,
  });

  if (icon) {
    try {
      const tree = await listPageTree(event, collective.id);

      const landing = findLandingPage(flattenPageTree(tree));

      if (landing) {
        const page = await getPage(event, collective.id, landing.id);

        await writePageIcon(event, collective.id, page, icon);
        collective.icon = icon;
        collective.iconOwnerPageId = page.id;
      }
    } catch (error) {
      console.error("[page-icons] failed to write collective icon after create:", error);
    }
  }

  return { collective };
});
