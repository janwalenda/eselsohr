<script setup lang="ts">
import { ref, watch } from "vue";
import type { WikiLinkSuggestionItem } from "@/lib/nc-text/editor/WikiLink";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  items: WikiLinkSuggestionItem[];
  command: (item: WikiLinkSuggestionItem) => void;
}>();

const selectedIndex = ref(0);

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0;
  },
);

function selectItem(index: number) {
  const item = props.items[index];

  if (!item) {
    return;
  }

  props.command(item);
}

function onKeyDown(event: KeyboardEvent) {
  if (props.items.length === 0) {
    return false;
  }

  if (event.key === "ArrowUp") {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length;
    return true;
  }

  if (event.key === "ArrowDown") {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length;
    return true;
  }

  if (event.key === "Enter") {
    selectItem(selectedIndex.value);
    return true;
  }

  return false;
}

defineExpose({ onKeyDown });
</script>

<template>
  <div
    class="max-h-64 min-w-48 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
  >
    <button
      v-for="(item, index) in items"
      :key="item.id"
      type="button"
      class="flex w-full rounded-sm px-2 py-1.5 text-left text-sm"
      :class="index === selectedIndex ? 'bg-accent text-accent-foreground' : ''"
      @mousedown.prevent
      @click="selectItem(index)"
    >
      {{ item.title }}
    </button>

    <p v-if="items.length === 0" class="px-2 py-1.5 text-sm text-muted-foreground">
      Keine Seiten gefunden
    </p>
  </div>
</template>
