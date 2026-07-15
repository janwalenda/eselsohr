type PollResponse = {
  ok: boolean;
  pending?: boolean;
};

type LoginStatusResponse = {
  status: "none" | "pending" | "active";
  ncUrl?: string;
};

export type LoginMode = "flow" | "manual";

export function useNextcloudLogin() {
  const ncUrl = ref("");

  const loginName = ref("");

  const appPassword = ref("");

  const loginMode = ref<LoginMode>("flow");

  const loading = ref(false);

  const polling = ref(false);

  const awaitingReturn = ref(false);

  const errorMessage = ref("");

  const pendingLoginUrl = ref("");

  const route = useRoute();

  const { fetchSession } = useNcSession();

  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  let pollingStopped = false;

  function clearPollTimer() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function shouldOfferManualFallback(error: unknown) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;

    const data =
      typeof error === "object" && error && "data" in error
        ? (error as { data?: { fallback?: string } }).data
        : null;

    return statusCode === 422 || data?.fallback === "manual";
  }

  function normalizeErrorMessage(error: unknown) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;

    const statusMessage =
      typeof error === "object" && error && "statusMessage" in error
        ? String((error as { statusMessage?: string }).statusMessage)
        : "";

    if (statusCode === 412) {
      return "Auf dieser Nextcloud-Instanz ist die Collectives-App nicht installiert oder nicht aktiv.";
    }

    if (statusCode === 410) {
      return "Der Login-Link ist abgelaufen. Bitte starte die Anmeldung erneut.";
    }

    return statusMessage || "Die Anmeldung konnte nicht abgeschlossen werden.";
  }

  function showManualFallback(error?: unknown) {
    loginMode.value = "manual";

    if (error) {
      errorMessage.value = normalizeErrorMessage(error);
    }
  }

  async function pollForLoginCompletion() {
    if (pollingStopped) {
      return;
    }

    try {
      const result = await $fetch<PollResponse>("/api/nc/login/poll", { method: "POST" });

      if (result.ok) {
        polling.value = false;
        loading.value = false;
        awaitingReturn.value = false;
        clearPollTimer();
        await fetchSession();
        await navigateTo("/app");
        return;
      }

      if (result.pending) {
        pollTimer = setTimeout(pollForLoginCompletion, 2000);
        return;
      }
    } catch (error) {
      if (shouldOfferManualFallback(error)) {
        polling.value = false;
        loading.value = false;
        awaitingReturn.value = false;
        clearPollTimer();
        showManualFallback(error);
        return;
      }

      errorMessage.value = normalizeErrorMessage(error);
      polling.value = false;
      loading.value = false;
      awaitingReturn.value = false;
      clearPollTimer();
      return;
    }

    pollTimer = setTimeout(pollForLoginCompletion, 2000);
  }

  function beginPolling() {
    if (polling.value) {
      return;
    }

    errorMessage.value = "";
    polling.value = true;
    loading.value = false;
    clearPollTimer();
    void pollForLoginCompletion();
  }

  async function resumePendingLogin() {
    const status = await $fetch<LoginStatusResponse>("/api/nc/login/status");

    if (status.status !== "pending") {
      awaitingReturn.value = false;

      if (status.status === "active") {
        await fetchSession();
        await navigateTo("/app");
      }

      return;
    }

    if (status.ncUrl) {
      ncUrl.value = status.ncUrl;
    }

    awaitingReturn.value = true;
    beginPolling();
  }

  function openNextcloudLoginTab(loginUrl: string) {
    const popup = window.open("about:blank", "_blank");

    if (!popup) {
      return false;
    }

    popup.opener = null;
    popup.location.replace(loginUrl);
    return true;
  }

  async function startLoginFlow() {
    errorMessage.value = "";
    pendingLoginUrl.value = "";
    loading.value = true;
    polling.value = false;
    awaitingReturn.value = false;
    pollingStopped = false;
    clearPollTimer();

    const popup = window.open("about:blank", "_blank");

    try {
      const { loginUrl } = await $fetch<{ loginUrl: string }>("/api/nc/login/start", {
        method: "POST",
        body: { ncUrl: ncUrl.value },
      });

      awaitingReturn.value = true;
      loading.value = false;
      pendingLoginUrl.value = loginUrl;
      beginPolling();

      if (popup && !popup.closed) {
        popup.opener = null;
        popup.location.replace(loginUrl);
        return;
      }

      if (!openNextcloudLoginTab(loginUrl)) {
        errorMessage.value =
          "Der neue Tab konnte nicht geoeffnet werden. Bitte erlaube Pop-ups fuer Eselsohr oder oeffne Nextcloud unten manuell.";
      }
    } catch (error) {
      popup?.close();
      loading.value = false;
      awaitingReturn.value = false;
      errorMessage.value = normalizeErrorMessage(error);
    }
  }

  function openPendingLoginUrl() {
    if (!pendingLoginUrl.value) {
      return;
    }

    if (!openNextcloudLoginTab(pendingLoginUrl.value)) {
      window.open(pendingLoginUrl.value, "_blank", "noopener,noreferrer");
    }
  }

  async function submitManualLogin() {
    errorMessage.value = "";
    loading.value = true;

    try {
      await $fetch("/api/nc/login/manual", {
        method: "POST",
        body: {
          ncUrl: ncUrl.value,
          loginName: loginName.value,
          appPassword: appPassword.value,
        },
      });
      appPassword.value = "";
      await fetchSession();
      await navigateTo("/app");
    } catch (error) {
      errorMessage.value = normalizeErrorMessage(error);
    } finally {
      loading.value = false;
    }
  }

  async function cancelLogin() {
    pollingStopped = true;
    clearPollTimer();
    polling.value = false;
    loading.value = false;
    awaitingReturn.value = false;
    errorMessage.value = "";
    await $fetch("/api/nc/login/cancel", { method: "POST" });
  }

  function onVisibilityChange() {
    if (document.visibilityState === "visible" && awaitingReturn.value && !pollingStopped) {
      beginPolling();
    }
  }

  onMounted(async () => {
    if (route.query.reconnect === "nextcloud") {
      errorMessage.value =
        "Die vorherige Nextcloud-Verbindung kann keine Collectives-Seiten erstellen. Bitte verbinde Eselsohr mit einem manuell erstellten App-Passwort erneut.";
    }

    if (route.query.fallback === "manual") {
      loginMode.value = "manual";
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    const status = await $fetch<LoginStatusResponse>("/api/nc/login/status");

    if (status.status === "active") {
      await fetchSession();
      await navigateTo("/app");
      return;
    }

    if (status.status === "pending") {
      if (status.ncUrl) {
        ncUrl.value = status.ncUrl;
      }

      awaitingReturn.value = true;
      beginPolling();
    }
  });

  onBeforeUnmount(() => {
    pollingStopped = true;
    clearPollTimer();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });

  return {
    ncUrl,
    loginName,
    appPassword,
    loginMode,
    loading,
    polling,
    awaitingReturn,
    errorMessage,
    pendingLoginUrl,
    showManualFallback,
    startLoginFlow,
    openPendingLoginUrl,
    resumePendingLogin,
    submitManualLogin,
    cancelLogin,
  };
}
