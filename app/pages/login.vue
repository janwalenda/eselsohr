<script setup lang="ts">
import LoginModeTabs from "@/components/login/LoginModeTabs.vue";
import LoginManualForm from "@/components/login/LoginManualForm.vue";
import LoginFlowForm from "@/components/login/LoginFlowForm.vue";
import LoginPendingCard from "@/components/login/LoginPendingCard.vue";
import LoginErrorCard from "@/components/login/LoginErrorCard.vue";
import { Card } from "@/components/ui/card";
import { useNextcloudLogin } from "@/composables/useNextcloudLogin";

definePageMeta({
  layout: "default",
});

const {
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
} = useNextcloudLogin();
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

    <LoginModeTabs v-model="loginMode" :disabled="awaitingReturn || polling" />

    <LoginManualForm
      v-if="loginMode === 'manual' && !awaitingReturn"
      :nc-url="ncUrl"
      :login-name="loginName"
      :app-password="appPassword"
      :loading="loading"
      @update:nc-url="ncUrl = $event"
      @update:login-name="loginName = $event"
      @update:app-password="appPassword = $event"
      @submit="submitManualLogin"
    />

    <LoginFlowForm
      v-else-if="!awaitingReturn"
      :nc-url="ncUrl"
      :loading="loading"
      @update:nc-url="ncUrl = $event"
      @submit="startLoginFlow"
    />

    <LoginPendingCard
      v-else
      :nc-url="ncUrl"
      :pending-login-url="pendingLoginUrl"
      :polling="polling"
      @open-pending="openPendingLoginUrl"
      @resume="resumePendingLogin"
      @cancel="cancelLogin"
    />

    <LoginErrorCard
      :error-message="errorMessage"
      :login-mode="loginMode"
      @show-manual-fallback="showManualFallback()"
    />

    <Card class="p-4 text-sm text-muted-foreground">
      Unterstützt werden beliebige Nextcloud-Instanzen ohne vorherige OAuth-Konfiguration in
      Eselsohr. Beim Abmelden wird das erzeugte App-Passwort wieder in Nextcloud widerrufen. Wenn
      der Login-Flow keine Collectives-Seiten erstellen kann, nutze den Tab „App-Passwort“.
    </Card>
  </div>
</template>
