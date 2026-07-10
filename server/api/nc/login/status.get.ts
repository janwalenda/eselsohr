import { getActiveSession, getPendingSession } from "../../../utils/nc-session";

export default defineEventHandler(async (event) => {
  const active = await getActiveSession(event);

  if (active) {
    return {
      status: "active" as const,
      ncUrl: active.ncUrl,
      loginName: active.loginName,
    };
  }

  const pending = await getPendingSession(event);

  if (pending) {
    return {
      status: "pending" as const,
      ncUrl: pending.ncUrl,
      startedAt: pending.startedAt,
    };
  }

  return { status: "none" as const };
});
