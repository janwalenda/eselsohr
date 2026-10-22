<script setup lang="ts">
import type { LoginMode } from "@/composables/useNextcloudLogin";
import { Button } from "@/components/ui/button";

defineProps<{
  modelValue: LoginMode;
  disabled: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: LoginMode];
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-2 rounded-lg border border-input p-1">
    <Button
      variant="ghost"
      class="w-full"
      :class="modelValue === 'flow' ? 'bg-muted' : ''"
      :disabled="disabled"
      @click="emit('update:modelValue', 'flow')"
    >
      Login-Flow
    </Button>
    <Button
      variant="ghost"
      class="w-full"
      :class="modelValue === 'manual' ? 'bg-muted' : ''"
      :disabled="disabled"
      @click="emit('update:modelValue', 'manual')"
    >
      App-Passwort
    </Button>
  </div>
</template>
