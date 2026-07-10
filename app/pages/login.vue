<script setup lang="ts">
definePageMeta({
  layout: "default",
});

type PollResponse = {
  ok: boolean;
  pending?: boolean;
};

type LoginStatusResponse = {
  status: "none" | "pending" | "active";
  ncUrl?: string;
};

type LoginMode = "flow" | "manual";

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

  if (statusMessage) {
    return statusMessage;
  }

  return "Die Anmeldung konnte nicht abgeschlossen werden.";
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

  // Safari only allows popups opened directly from the user gesture.
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
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Mit deiner Nextcloud verbinden</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Verbinde Eselsohr mit deiner Nextcloud-Instanz. Wenn der automatische Login-Flow fuer
        Collectives-Schreibzugriff nicht funktioniert, kannst du ein manuelles App-Passwort
        verwenden.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2 rounded-lg border border-input p-1">
      <Button
        variant="ghost"
        class="w-full"
        :class="loginMode === 'flow' ? 'bg-muted' : ''"
        :disabled="awaitingReturn || polling"
        @click="loginMode = 'flow'"
      >
        Login-Flow
      </Button>
      <Button
        variant="ghost"
        class="w-full"
        :class="loginMode === 'manual' ? 'bg-muted' : ''"
        :disabled="awaitingReturn || polling"
        @click="loginMode = 'manual'"
      >
        App-Passwort
      </Button>
    </div>

    <Card v-if="loginMode === 'manual' && !awaitingReturn" class="space-y-4 p-6">
      <div class="space-y-2">
        <label for="manual-nc-url" class="text-sm font-medium">Nextcloud-URL</label>
        <input
          id="manual-nc-url"
          v-model.trim="ncUrl"
          type="url"
          inputmode="url"
          autocomplete="url"
          placeholder="https://cloud.example.com"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          :disabled="loading"
        />
      </div>

      <div class="space-y-2">
        <label for="manual-login-name" class="text-sm font-medium">Benutzername</label>
        <input
          id="manual-login-name"
          v-model.trim="loginName"
          type="text"
          autocomplete="username"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          :disabled="loading"
        />
      </div>

      <div class="space-y-2">
        <label for="manual-app-password" class="text-sm font-medium">App-Passwort</label>
        <input
          id="manual-app-password"
          v-model="appPassword"
          type="password"
          autocomplete="current-password"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          :disabled="loading"
        />
        <p class="text-xs text-muted-foreground">
          Erstelle in Nextcloud unter Einstellungen &gt; Sicherheit ein neues App-Passwort und fuege
          es hier ein.
        </p>
      </div>

      <Button
        class="w-full"
        :disabled="loading || !ncUrl || !loginName || !appPassword"
        @click="submitManualLogin"
      >
        <span v-if="loading">Verbindung wird geprueft…</span>
        <span v-else>Mit App-Passwort verbinden</span>
      </Button>
    </Card>

    <Card v-else-if="!awaitingReturn" class="space-y-4 p-6">
      <div class="space-y-2">
        <label for="nc-url" class="text-sm font-medium">Nextcloud-URL</label>
        <input
          id="nc-url"
          v-model.trim="ncUrl"
          type="url"
          inputmode="url"
          autocomplete="url"
          placeholder="https://cloud.example.com"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          :disabled="loading"
          @keydown.enter.prevent="startLoginFlow"
        />
      </div>

      <Button class="w-full" :disabled="loading || !ncUrl" @click="startLoginFlow">
        <span v-if="loading">Weiterleitung zu Nextcloud…</span>
        <span v-else>Mit Nextcloud fortfahren</span>
      </Button>
    </Card>

    <Card v-else class="space-y-4 p-6">
      <div class="space-y-2">
        <h2 class="text-sm font-medium">Freigabe in Nextcloud</h2>
        <p class="text-sm text-muted-foreground">
          <template v-if="polling">
            Eselsohr bleibt in diesem Tab geoeffnet. Bestaetige die Freigabe im Nextcloud-Tab, dann
            geht es hier automatisch weiter.
          </template>
          <template v-else>
            Falls der Nextcloud-Tab nicht automatisch geoeffnet wurde, pruefe den Pop-up-Blocker
            oder oeffne Nextcloud unten manuell.
          </template>
        </p>
        <p v-if="ncUrl" class="truncate text-xs text-muted-foreground">
          {{ ncUrl }}
        </p>
      </div>

      <Button
        v-if="pendingLoginUrl"
        class="w-full"
        variant="outline"
        :disabled="polling"
        @click="openPendingLoginUrl"
      >
        Nextcloud in neuem Tab oeffnen
      </Button>

      <Button class="w-full" variant="secondary" :disabled="polling" @click="resumePendingLogin">
        <span v-if="polling">Warte auf Bestätigung…</span>
        <span v-else>Verbindung prüfen</span>
      </Button>

      <Button class="w-full" variant="ghost" :disabled="polling" @click="cancelLogin">
        Abbrechen
      </Button>
    </Card>

    <Card
      v-if="errorMessage"
      class="border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ errorMessage }}
      <div v-if="loginMode === 'flow'" class="mt-3">
        <Button variant="outline" size="sm" @click="showManualFallback()">
          Stattdessen App-Passwort verwenden
        </Button>
      </div>
    </Card>

    <Card class="p-4 text-sm text-muted-foreground">
      Unterstützt werden beliebige Nextcloud-Instanzen ohne vorherige OAuth-Konfiguration in
      Eselsohr. Beim Abmelden wird das erzeugte App-Passwort wieder in Nextcloud widerrufen. Wenn
      der Login-Flow keine Collectives-Seiten erstellen kann, nutze den Tab „App-Passwort“.
    </Card>
  </div>
</template>
