import { hasCollectivesCapability, normalizeNcUrl } from "../../../utils/nc-api";
import { promoteToActive } from "../../../utils/nc-session";

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    ncUrl?: string;
    loginName?: string;
    appPassword?: string;
  }>(event);

  const ncUrl = normalizeNcUrl(body?.ncUrl || "");

  const loginName = body?.loginName?.trim();

  const appPassword = body?.appPassword?.trim();

  if (!loginName) {
    throw createError({ statusCode: 400, statusMessage: "Nextcloud login name is required" });
  }

  if (!appPassword) {
    throw createError({ statusCode: 400, statusMessage: "Nextcloud app password is required" });
  }

  const credentials = {
    ncUrl,
    loginName,
    appPassword,
  };

  const hasCollectives = await hasCollectivesCapability(credentials);

  if (!hasCollectives) {
    throw createError({
      statusCode: 412,
      statusMessage:
        "Auf dieser Nextcloud-Instanz ist die Collectives-App nicht installiert oder nicht aktiv.",
    });
  }

  await promoteToActive(event, credentials);

  return {
    ok: true,
    session: {
      ncUrl: credentials.ncUrl,
      loginName: credentials.loginName,
    },
  };
});
