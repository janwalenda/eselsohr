<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

defineProps<{
  ncUrl: string;
  loginName: string;
  appPassword: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:ncUrl": [value: string];
  "update:loginName": [value: string];
  "update:appPassword": [value: string];
  submit: [];
}>();
</script>

<template>
  <Card class="space-y-4 p-6">
    <div class="space-y-2">
      <label for="manual-nc-url" class="text-sm font-medium">Nextcloud-URL</label>
      <input
        id="manual-nc-url"
        :value="ncUrl"
        type="url"
        inputmode="url"
        autocomplete="url"
        placeholder="https://cloud.example.com"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        :disabled="loading"
        @input="emit('update:ncUrl', ($event.target as HTMLInputElement).value.trim())"
      />
    </div>

    <div class="space-y-2">
      <label for="manual-login-name" class="text-sm font-medium">Benutzername</label>
      <input
        id="manual-login-name"
        :value="loginName"
        type="text"
        autocomplete="username"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        :disabled="loading"
        @input="emit('update:loginName', ($event.target as HTMLInputElement).value.trim())"
      />
    </div>

    <div class="space-y-2">
      <label for="manual-app-password" class="text-sm font-medium">App-Passwort</label>
      <input
        id="manual-app-password"
        :value="appPassword"
        type="password"
        autocomplete="current-password"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        :disabled="loading"
        @input="emit('update:appPassword', ($event.target as HTMLInputElement).value)"
      />
      <p class="text-xs text-muted-foreground">
        Erstelle in Nextcloud unter Einstellungen &gt; Sicherheit ein neues App-Passwort und fuege
        es hier ein.
      </p>
    </div>

    <Button
      class="w-full"
      :disabled="loading || !ncUrl || !loginName || !appPassword"
      @click="emit('submit')"
    >
      <span v-if="loading">Verbindung wird geprueft…</span>
      <span v-else>Mit App-Passwort verbinden</span>
    </Button>
  </Card>
</template>
