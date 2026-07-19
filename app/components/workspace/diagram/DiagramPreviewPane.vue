<script setup lang="ts">
defineProps<{
  previewSvg: string;
  previewError: string;
  compact?: boolean;
}>();
</script>

<template>
  <div
    :class="
      compact
        ? 'min-h-0 flex-1 overflow-auto rounded-md border bg-muted/20 p-3'
        : 'min-h-0 overflow-auto rounded-md border bg-muted/20 p-3'
    "
  >
    <p v-if="previewError" class="text-sm text-destructive">{{ previewError }}</p>
    <!-- Mermaid SVG is produced with securityLevel: strict -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="mermaid-preview" v-html="previewSvg" />
  </div>
</template>
