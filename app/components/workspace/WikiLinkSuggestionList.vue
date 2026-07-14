<script setup lang="ts">
import { ref, watch } from "vue";
import type { WikiLinkSuggestionItem } from "@/lib/nc-text/editor/WikiLink";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  items: WikiLinkSuggestionItem[];
  query: string;
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
  if (event.key === "Enter") {
    const target = props.query.trim();

    if (props.items.length === 0) {
      if (!target) {
        return false;
      }

      props.command({ id: -1, title: target });
      return true;
    }

    selectItem(selectedIndex.value);
    return true;
  }

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

  return false;
}

defineExpose({ onKeyDown });
</script>

<template>
  <div
    class="max-h-64 min-w-48 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md bg-white/60 backdrop-blur-sm"
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

    <p v-if="items.length === 0 && query.trim()" class="px-2 py-1.5 text-sm text-muted-foreground">
      Keine Seiten gefunden — Enter für neuen Link
    </p>
    <p v-else-if="items.length === 0" class="px-2 py-1.5 text-sm text-muted-foreground">
      Seitentitel eingeben…
    </p>
  </div>
</template>
