<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

type PollResponse = {
  ok: boolean
  pending?: boolean
}

type LoginStatusResponse = {
  status: 'none' | 'pending' | 'active'
  ncUrl?: string
}

const ncUrl = ref('')
const loading = ref(false)
const polling = ref(false)
const awaitingReturn = ref(false)
const errorMessage = ref('')

const { fetchSession } = useNcSession()

let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollingStopped = false

function clearPollTimer() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function normalizeErrorMessage(error: unknown) {
  const statusCode = typeof error === 'object' && error && 'statusCode' in error
    ? Number((error as { statusCode?: number }).statusCode)
    : null
  const statusMessage = typeof error === 'object' && error && 'statusMessage' in error
    ? String((error as { statusMessage?: string }).statusMessage)
    : ''

  if (statusCode === 412) {
    return 'Auf dieser Nextcloud-Instanz ist die Collectives-App nicht installiert oder nicht aktiv.'
  }
  if (statusCode === 410) {
    return 'Der Login-Link ist abgelaufen. Bitte starte die Anmeldung erneut.'
  }
  if (statusMessage) {
    return statusMessage
  }
  return 'Die Anmeldung konnte nicht abgeschlossen werden.'
}

async function pollForLoginCompletion() {
  if (pollingStopped) {
    return
  }

  try {
    const result = await $fetch<PollResponse>('/api/nc/login/poll', { method: 'POST' })
    if (result.ok) {
      polling.value = false
      loading.value = false
      awaitingReturn.value = false
      clearPollTimer()
      await fetchSession()
      await navigateTo('/app')
      return
    }

    if (result.pending) {
      pollTimer = setTimeout(pollForLoginCompletion, 2000)
      return
    }
  }
  catch (error) {
    errorMessage.value = normalizeErrorMessage(error)
    polling.value = false
    loading.value = false
    awaitingReturn.value = false
    clearPollTimer()
    return
  }

  pollTimer = setTimeout(pollForLoginCompletion, 2000)
}

function beginPolling() {
  if (polling.value) {
    return
  }

  errorMessage.value = ''
  polling.value = true
  loading.value = false
  clearPollTimer()
  void pollForLoginCompletion()
}

async function resumePendingLogin() {
  const status = await $fetch<LoginStatusResponse>('/api/nc/login/status')
  if (status.status !== 'pending') {
    awaitingReturn.value = false
    if (status.status === 'active') {
      await fetchSession()
      await navigateTo('/app')
    }
    return
  }

  if (status.ncUrl) {
    ncUrl.value = status.ncUrl
  }
  awaitingReturn.value = true
  beginPolling()
}

async function startLoginFlow() {
  errorMessage.value = ''
  loading.value = true
  polling.value = false
  awaitingReturn.value = false
  pollingStopped = false
  clearPollTimer()

  // Safari on iOS only allows popups opened directly
  // from the user gesture. Open a placeholder tab first,
  // then navigate it after the async login request resolves.
  const popup = window.open('', '_blank', 'noopener,noreferrer')

  try {
    const { loginUrl } = await $fetch<{ loginUrl: string }>('/api/nc/login/start', {
      method: 'POST',
      body: { ncUrl: ncUrl.value },
    })

    awaitingReturn.value = true
    loading.value = false
    beginPolling()

    if (popup) {
      popup.location.href = loginUrl
    }
    else {
      // Fallback when popup creation is still blocked.
      window.location.href = loginUrl
    }
  }
  catch (error) {
    popup?.close()
    loading.value = false
    awaitingReturn.value = false
    errorMessage.value = normalizeErrorMessage(error)
  }
}

async function cancelLogin() {
  pollingStopped = true
  clearPollTimer()
  polling.value = false
  loading.value = false
  awaitingReturn.value = false
  errorMessage.value = ''
  await $fetch('/api/nc/login/cancel', { method: 'POST' })
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && awaitingReturn.value && !pollingStopped) {
    beginPolling()
  }
}

onMounted(async () => {
  document.addEventListener('visibilitychange', onVisibilityChange)

  const status = await $fetch<LoginStatusResponse>('/api/nc/login/status')
  if (status.status === 'active') {
    await fetchSession()
    await navigateTo('/app')
    return
  }
  if (status.status === 'pending') {
    if (status.ncUrl) {
      ncUrl.value = status.ncUrl
    }
    awaitingReturn.value = true
    beginPolling()
  }
})

onBeforeUnmount(() => {
  pollingStopped = true
  clearPollTimer()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        Mit deiner Nextcloud verbinden
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Gib die URL deiner Nextcloud-Instanz an. Die Freigabe wird in einem neuen Tab geoeffnet,
        waehrend Eselsohr hier auf die Bestaetigung wartet.
      </p>
    </div>

    <Card v-if="!awaitingReturn" class="space-y-4 p-6">
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
        >
      </div>

      <Button class="w-full" :disabled="loading || !ncUrl" @click="startLoginFlow">
        <span v-if="loading">Weiterleitung zu Nextcloud…</span>
        <span v-else>Mit Nextcloud fortfahren</span>
      </Button>
    </Card>

    <Card v-else class="space-y-4 p-6">
      <div class="space-y-2">
        <h2 class="text-sm font-medium">
          Freigabe in Nextcloud
        </h2>
        <p class="text-sm text-muted-foreground">
          <template v-if="polling">
            Verbinde mit Nextcloud… Sobald du die Freigabe bestätigt hast, geht es automatisch weiter.
          </template>
          <template v-else>
            Falls der neue Tab nicht automatisch geoeffnet wurde, pruefe den Pop-up-Blocker
            oder tippe unten auf „Verbindung pruefen“.
          </template>
        </p>
        <p v-if="ncUrl" class="truncate text-xs text-muted-foreground">
          {{ ncUrl }}
        </p>
      </div>

      <Button
        class="w-full"
        variant="secondary"
        :disabled="polling"
        @click="resumePendingLogin"
      >
        <span v-if="polling">Warte auf Bestätigung…</span>
        <span v-else>Verbindung prüfen</span>
      </Button>

      <Button
        class="w-full"
        variant="ghost"
        :disabled="polling"
        @click="cancelLogin"
      >
        Abbrechen
      </Button>
    </Card>

    <Card
      v-if="errorMessage"
      class="border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {{ errorMessage }}
    </Card>

    <Card class="p-4 text-sm text-muted-foreground">
      Unterstützt werden beliebige Nextcloud-Instanzen ohne vorherige OAuth-Konfiguration in
      Eselsohr. Beim Abmelden wird das erzeugte App-Passwort wieder in Nextcloud widerrufen.
    </Card>
  </div>
</template>
