import { normalizeNcUrl } from "../../../utils/nc-api";
import { setPendingSession } from "../../../utils/nc-session";

type LoginFlowStartResponse = {
  poll?: {
    token?: string;
    endpoint?: string;
  };
  login?: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ncUrl?: string }>(event);

  const ncUrl = normalizeNcUrl(body?.ncUrl || "");

  const config = useRuntimeConfig(event);

  const response = await fetch(`${ncUrl}/index.php/login/v2`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "User-Agent": config.appName || "Eselsohr",
    },
  });

  const payload = (await response.json()) as LoginFlowStartResponse;

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: "Failed to start Nextcloud login flow",
      data: payload,
    });
  }

  if (!payload.login || !payload.poll?.token || !payload.poll?.endpoint) {
    throw createError({
      statusCode: 502,
      statusMessage: "Nextcloud login flow returned an incomplete response",
      data: payload,
    });
  }

  await setPendingSession(event, {
    ncUrl,
    pollToken: payload.poll.token,
    pollEndpoint: payload.poll.endpoint,
  });

  return {
    loginUrl: payload.login,
  };
});
