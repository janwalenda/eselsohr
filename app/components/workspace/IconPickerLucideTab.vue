<script setup lang="ts">
import type { Component } from "vue";
import { Input } from "@/components/ui/input";

defineProps<{
  lucideQuery: string;
  filteredLucide: readonly string[];
  lucidePreviews: Map<string, Component>;
}>();

const emit = defineEmits<{
  "update:lucideQuery": [value: string];
  selectLucide: [name: string];
}>();
</script>

<template>
  <div class="space-y-3">
    <Input
      :model-value="lucideQuery"
      placeholder="Icon suchen…"
      @update:model-value="emit('update:lucideQuery', String($event))"
    />
    <div class="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
      <button
        v-for="name in filteredLucide.slice(0, 48)"
        :key="name"
        type="button"
        class="flex size-9 items-center justify-center rounded-md hover:bg-muted"
        :title="name"
        @click="emit('selectLucide', name)"
      >
        <component :is="lucidePreviews.get(name)" v-if="lucidePreviews.get(name)" class="size-4" />
      </button>
    </div>
  </div>
</template>
