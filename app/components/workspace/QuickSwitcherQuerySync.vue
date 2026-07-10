<script setup lang="ts">
import { watch } from "vue";
import { useCommand } from "@/components/ui/command";

const emit = defineEmits<{
  change: [value: string];
}>();

const { filterState } = useCommand();

watch(
  () => filterState.search,
  (value) => {
    emit("change", value);
  },
  { immediate: true },
);
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
