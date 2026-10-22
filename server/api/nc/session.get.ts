import { getActiveSession } from "../../utils/nc-session";

export default defineEventHandler(async (event) => {
  const session = await getActiveSession(event);

  if (!session) {
    return null;
  }

  return {
    ncUrl: session.ncUrl,
    loginName: session.loginName,
  };
});
