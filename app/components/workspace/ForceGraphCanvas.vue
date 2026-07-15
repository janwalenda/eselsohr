<script setup lang="ts">
import type { GraphData, GraphMode, GraphNode } from "~~/shared/graph";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  graphData: GraphData | null;
  mode: GraphMode;
}>();

const emit = defineEmits<{
  nodeClick: [node: GraphNode];
}>();

const containerRef = ref<HTMLDivElement | null>(null);

type ForceGraphInstance = {
  graphData: (data?: GraphData) => ForceGraphInstance;
  width: (value?: number) => ForceGraphInstance | number;
  height: (value?: number) => ForceGraphInstance | number;
  nodeVal: (value: (node: GraphNode) => number) => ForceGraphInstance;
  nodeRelSize: (value: number) => ForceGraphInstance;
  nodeLabel: (value: (node: GraphNode) => string) => ForceGraphInstance;
  nodeColor: (value: (node: GraphNode) => string) => ForceGraphInstance;
  linkDirectionalArrowLength: (value: number) => ForceGraphInstance;
  linkColor: (value: () => string) => ForceGraphInstance;
  linkWidth: (value: number) => ForceGraphInstance;
  backgroundColor: (value: string) => ForceGraphInstance;
  onNodeClick: (value: (node: GraphNode) => void) => ForceGraphInstance;
  onEngineStop: (value: () => void) => ForceGraphInstance;
  enableZoomInteraction: (value: boolean) => ForceGraphInstance;
  enablePanInteraction: (value: boolean) => ForceGraphInstance;
  zoomToFit: (durationMs?: number, padding?: number) => ForceGraphInstance;
  warmupTicks: (value: number) => ForceGraphInstance;
  cooldownTicks: (value: number) => ForceGraphInstance;
  _destructor?: () => void;
};

let graph: ForceGraphInstance | null = null;

let resizeObserver: ResizeObserver | null = null;

function getThemeColor(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();

  return value || fallback;
}

function configureGraph(instance: ForceGraphInstance) {
  instance
    .nodeVal((node) => node.val)
    .nodeRelSize(2)
    .nodeLabel((node) => node.title)
    .nodeColor((node) =>
      node.kind === "broken"
        ? getThemeColor("--color-muted-foreground", "oklch(70% 0 0)")
        : getThemeColor("--color-foreground", "oklch(20% 0 0)"),
    )
    .linkColor(() => getThemeColor("--color-border", "oklch(85% 0 0)"))
    .linkWidth(1.5)
    .linkDirectionalArrowLength(0)
    .backgroundColor("transparent")
    .warmupTicks(80)
    .cooldownTicks(20)
    .enableZoomInteraction(true)
    .enablePanInteraction(true)
    .onNodeClick((node) => {
      emit("nodeClick", node);
    })
    .onEngineStop(() => {
      graph?.zoomToFit(400, 64);
    });
}

function updateDimensions() {
  if (!graph || !containerRef.value) {
    return;
  }

  const { clientWidth, clientHeight } = containerRef.value;

  if (clientWidth <= 0 || clientHeight <= 0) {
    return;
  }

  graph.width(clientWidth);
  graph.height(clientHeight);
}

function applyGraphData() {
  if (!graph || !props.graphData?.nodes.length) {
    return;
  }

  graph.graphData({
    nodes: props.graphData.nodes.map((node) => ({ ...node })),
    links: props.graphData.links.map((link) => ({ ...link })),
  });
  updateDimensions();
}

async function refreshGraphView() {
  await nextTick();
  updateDimensions();
  applyGraphData();
}

async function mountGraph() {
  if (!containerRef.value) {
    return;
  }

  const { default: ForceGraph } = await import("force-graph");

  graph = ForceGraph()(containerRef.value) as ForceGraphInstance;
  configureGraph(graph);

  resizeObserver = new ResizeObserver(() => {
    updateDimensions();
  });
  resizeObserver.observe(containerRef.value);

  await refreshGraphView();
  requestAnimationFrame(() => {
    void refreshGraphView();
  });
}

onMounted(() => {
  void mountGraph();
});

watch(
  () => props.graphData,
  () => {
    void refreshGraphView();
  },
  { deep: true },
);

watch(
  () => props.mode,
  () => {
    void refreshGraphView();
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  graph?._destructor?.();
  graph = null;
});
</script>

<template>
  <div ref="containerRef" class="h-full min-h-[24rem] w-full touch-none" />
</template>
