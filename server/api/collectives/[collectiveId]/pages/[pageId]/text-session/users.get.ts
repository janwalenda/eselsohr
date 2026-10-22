import { ncFetchJson } from "../../../../../../utils/nc-api";

/**
 * Proxy for the Nextcloud Text mention user search
 * (`GET /apps/text/api/v1/users`). The browser forwards the session handle as
 * query parameters; credentials are injected server-side by `ncFetchJson`.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const params = new URLSearchParams();

  for (const key of ["filter", "documentId", "sessionId", "sessionToken"] as const) {
    const value = query[key];

    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  return ncFetchJson(event, `/index.php/apps/text/api/v1/users?${params.toString()}`);
});
