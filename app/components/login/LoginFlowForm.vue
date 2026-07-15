<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

defineProps<{
  ncUrl: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:ncUrl": [value: string];
  submit: [];
}>();
</script>

<template>
  <Card class="space-y-4 p-6">
    <div class="space-y-2">
      <label for="nc-url" class="text-sm font-medium">Nextcloud-URL</label>
      <input
        id="nc-url"
        :value="ncUrl"
        type="url"
        inputmode="url"
        autocomplete="url"
        placeholder="https://cloud.example.com"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        :disabled="loading"
        @input="emit('update:ncUrl', ($event.target as HTMLInputElement).value.trim())"
        @keydown.enter.prevent="emit('submit')"
      />
    </div>

    <Button class="w-full" :disabled="loading || !ncUrl" @click="emit('submit')">
      <span v-if="loading">Weiterleitung zu Nextcloud…</span>
      <span v-else>Mit Nextcloud fortfahren</span>
    </Button>
  </Card>
</template>
