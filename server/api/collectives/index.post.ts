import { createCollective } from "../../utils/nc-collectives";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; emoji?: string | null }>(event);

  const name = body.name?.trim();

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "A name is required" });
  }

  const emoji = body.emoji?.trim() || null;

  const collective = await createCollective(event, {
    name,
    emoji,
  });

  return { collective };
});
