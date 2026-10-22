<script setup lang="ts">
import type { LoginMode } from "@/composables/useNextcloudLogin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

defineProps<{
  errorMessage: string;
  loginMode: LoginMode;
}>();

const emit = defineEmits<{
  showManualFallback: [];
}>();
</script>

<template>
  <Card
    v-if="errorMessage"
    class="border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
  >
    {{ errorMessage }}
    <div v-if="loginMode === 'flow'" class="mt-3">
      <Button size="sm" @click="emit('showManualFallback')">
        Stattdessen App-Passwort verwenden
      </Button>
    </div>
  </Card>
</template>
