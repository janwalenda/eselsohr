import { COLLECTIVES_WRITE_AUTH_ERROR_CODE } from "../../../../shared/api-errors";
import { hasCollectivesCapability, normalizeNcUrl, revokeAppPassword } from "../../../utils/nc-api";
import { validateCollectivesWriteAccess } from "../../../utils/nc-auth-validation";
import { clearNcSession, getPendingSession, promoteToActive } from "../../../utils/nc-session";

type LoginFlowPollResponse = {
  server?: string;
  loginName?: string;
  appPassword?: string;
};

const LOGIN_FLOW_TIMEOUT_MS = 20 * 60 * 1000;

export default defineEventHandler(async (event) => {
  const pendingSession = await getPendingSession(event);

  if (!pendingSession) {
    throw createError({
      statusCode: 409,
      statusMessage: "No pending Nextcloud login flow found",
    });
  }

  if (Date.now() - pendingSession.startedAt > LOGIN_FLOW_TIMEOUT_MS) {
    await clearNcSession(event);
    throw createError({
      statusCode: 410,
      statusMessage: "The Nextcloud login flow expired. Please start again.",
    });
  }

  const response = await fetch(pendingSession.pollEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ token: pendingSession.pollToken }),
  });

  if (response.status === 404) {
    return {
      ok: false,
      pending: true,
    };
  }

  const payload = (await response.json()) as LoginFlowPollResponse;

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: "Failed to poll the Nextcloud login flow",
      data: payload,
    });
  }

  if (!payload.server || !payload.loginName || !payload.appPassword) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud login flow returned incomplete credentials",
      data: payload,
    });
  }

  const credentials = {
    ncUrl: normalizeNcUrl(payload.server),
    loginName: payload.loginName,
    appPassword: payload.appPassword,
  };

  const hasCollectives = await hasCollectivesCapability(credentials);

  if (!hasCollectives) {
    await revokeAppPassword(credentials);
    await clearNcSession(event);
    throw createError({
      statusCode: 412,
      statusMessage: "The Nextcloud Collectives app is not installed on this server",
    });
  }

  const validation = await validateCollectivesWriteAccess(credentials);

  if (!validation.ok) {
    await revokeAppPassword(credentials);
    await clearNcSession(event);
    throw createError({
      statusCode: 422,
      statusMessage: validation.message,
      data: {
        code: COLLECTIVES_WRITE_AUTH_ERROR_CODE,
        reason: validation.reason,
        fallback: "manual",
      },
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
