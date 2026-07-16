<script setup lang="ts">
import type { GraphData, GraphMode, GraphNode } from "~~/shared/graph";
import { useForceGraphCanvas } from "@/composables/useForceGraphCanvas";

const props = defineProps<{
  graphData: GraphData | null;
  mode: GraphMode;
}>();

const emit = defineEmits<{
  nodeClick: [node: GraphNode];
}>();

const { containerRef } = useForceGraphCanvas(
  () => props.graphData,
  () => props.mode,
  (node) => emit("nodeClick", node),
);
</script>

<template>
  <div ref="containerRef" class="h-full min-h-[24rem] w-full touch-none" />
</template>
