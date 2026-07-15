<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

defineProps<{
  ncUrl: string;
  pendingLoginUrl: string;
  polling: boolean;
}>();

const emit = defineEmits<{
  openPending: [];
  resume: [];
  cancel: [];
}>();
</script>

<template>
  <Card class="space-y-4 p-6">
    <div class="space-y-2">
      <h2 class="text-sm font-medium">Freigabe in Nextcloud</h2>
      <p class="text-sm text-muted-foreground">
        <template v-if="polling">
          Eselsohr bleibt in diesem Tab geoeffnet. Bestaetige die Freigabe im Nextcloud-Tab, dann
          geht es hier automatisch weiter.
        </template>
        <template v-else>
          Falls der Nextcloud-Tab nicht automatisch geoeffnet wurde, pruefe den Pop-up-Blocker oder
          oeffne Nextcloud unten manuell.
        </template>
      </p>
      <p v-if="ncUrl" class="truncate text-xs text-muted-foreground">
        {{ ncUrl }}
      </p>
    </div>

    <Button v-if="pendingLoginUrl" class="w-full" :disabled="polling" @click="emit('openPending')">
      Nextcloud in neuem Tab oeffnen
    </Button>

    <Button class="w-full" variant="secondary" :disabled="polling" @click="emit('resume')">
      <span v-if="polling">Warte auf Bestätigung…</span>
      <span v-else>Verbindung prüfen</span>
    </Button>

    <Button class="w-full" variant="ghost" :disabled="polling" @click="emit('cancel')">
      Abbrechen
    </Button>
  </Card>
</template>
