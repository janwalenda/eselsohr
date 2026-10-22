import { getPublicShareMapping } from "../../../utils/public-shares";

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token")?.trim();

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Invalid share token" });
  }

  const share = await getPublicShareMapping(event, token);

  return { share };
});
