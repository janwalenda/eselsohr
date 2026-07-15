import type { H3Event } from "h3";

type PendingNcSession = {
  state: "pending";
  ncUrl: string;
  pollToken: string;
  pollEndpoint: string;
  startedAt: number;
};

type ActiveNcSession = {
  state: "active";
  ncUrl: string;
  loginName: string;
  appPassword: string;
  createdAt: number;
};

type NcSessionData = Partial<PendingNcSession & ActiveNcSession> & {
  state?: "pending" | "active";
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const DEV_SESSION_PASSWORD = "eselsohr-dev-session-password-32chars";

function getSessionPassword(event: H3Event): string {
  const config = useRuntimeConfig(event);

  const configuredPassword = config.sessionPassword || process.env.NUXT_SESSION_PASSWORD || "";

  const password =
    configuredPassword || (process.env.NODE_ENV === "production" ? "" : DEV_SESSION_PASSWORD);

  if (password.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: "NUXT_SESSION_PASSWORD must be set to at least 32 characters",
    });
  }

  return password;
}

async function useNcCookieSession(event: H3Event) {
  return useSession<NcSessionData>(event, {
    name: "eselsohr-session",
    password: getSessionPassword(event),
    maxAge: SESSION_MAX_AGE_SECONDS,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  });
}

export async function getSessionState(event: H3Event): Promise<"pending" | "active" | null> {
  const session = await useNcCookieSession(event);

  return session.data.state ?? null;
}

export async function getPendingSession(event: H3Event): Promise<PendingNcSession | null> {
  const session = await useNcCookieSession(event);

  if (
    session.data.state !== "pending" ||
    !session.data.ncUrl ||
    !session.data.pollToken ||
    !session.data.pollEndpoint ||
    typeof session.data.startedAt !== "number"
  ) {
    return null;
  }

  return {
    state: "pending",
    ncUrl: session.data.ncUrl,
    pollToken: session.data.pollToken,
    pollEndpoint: session.data.pollEndpoint,
    startedAt: session.data.startedAt,
  };
}

export async function getActiveSession(event: H3Event): Promise<ActiveNcSession | null> {
  const session = await useNcCookieSession(event);

  if (
    session.data.state !== "active" ||
    !session.data.ncUrl ||
    !session.data.loginName ||
    !session.data.appPassword ||
    typeof session.data.createdAt !== "number"
  ) {
    return null;
  }

  return {
    state: "active",
    ncUrl: session.data.ncUrl,
    loginName: session.data.loginName,
    appPassword: session.data.appPassword,
    createdAt: session.data.createdAt,
  };
}

export async function setPendingSession(
  event: H3Event,
  data: Omit<PendingNcSession, "state" | "startedAt">,
) {
  const session = await useNcCookieSession(event);

  await session.clear();
  await session.update({
    state: "pending",
    ncUrl: data.ncUrl,
    pollToken: data.pollToken,
    pollEndpoint: data.pollEndpoint,
    startedAt: Date.now(),
  });
}

export async function promoteToActive(
  event: H3Event,
  data: Omit<ActiveNcSession, "state" | "createdAt">,
) {
  const session = await useNcCookieSession(event);

  await session.clear();
  await session.update({
    state: "active",
    ncUrl: data.ncUrl,
    loginName: data.loginName,
    appPassword: data.appPassword,
    createdAt: Date.now(),
  });
}

export async function clearNcSession(event: H3Event) {
  const session = await useNcCookieSession(event);

  await session.clear();
}
