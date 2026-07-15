<script setup lang="ts">
import { Button } from "@/components/ui/button";

defineProps<{
  sourceRemoteStale: boolean;
  hasConflict: boolean;
  expired: boolean;
}>();

const emit = defineEmits<{
  reload: [];
}>();
</script>

<template>
  <div
    v-if="sourceRemoteStale"
    class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
  >
    Die Seite wurde von einem anderen Nutzer geändert — bitte den Modus wechseln, um den Inhalt zu
    aktualisieren.
  </div>

  <div
    v-if="hasConflict"
    class="flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
  >
    <span>Die Seite wurde außerhalb dieser Sitzung geändert.</span>
    <Button size="sm" @click="emit('reload')"> Neu laden </Button>
  </div>

  <div
    v-if="expired"
    class="flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
  >
    <span>Die Bearbeitungssitzung ist abgelaufen.</span>
    <Button size="sm" @click="emit('reload')"> Neu laden </Button>
  </div>
</template>
