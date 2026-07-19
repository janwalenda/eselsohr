<script setup lang="ts">
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { VueFlow } from "@vue-flow/core";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlowchartCanvas } from "@/composables/useFlowchartCanvas";
import type { FlowchartDirection, FlowchartModel, FlowchartNodeShape } from "@/lib/mermaid/types";

const model = defineModel<FlowchartModel>({ required: true });

defineProps<{
  compact?: boolean;
}>();

const canvas = reactive(useFlowchartCanvas(model));
</script>

<template>
  <div
    :class="
      compact
        ? 'flex h-full min-h-0 flex-1 flex-col gap-2'
        : 'flex h-full min-h-[280px] flex-col gap-3'
    "
  >
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <Button type="button" size="sm" @click="canvas.addNode">
        {{ compact ? "Knoten" : "Knoten hinzufügen" }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        :disabled="!canvas.selectedNodeId"
        @click="canvas.startConnectMode"
      >
        {{ canvas.connectFromId ? "Ziel…" : "Verbinden" }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        :disabled="!canvas.selectedNodeId"
        @click="canvas.removeSelectedNode"
      >
        Löschen
      </Button>
      <div :class="compact ? 'flex flex-wrap gap-1' : 'ml-auto flex flex-wrap gap-1'">
        <Button
          v-for="dir in ['TD', 'LR', 'RL', 'BT'] as FlowchartDirection[]"
          :key="dir"
          type="button"
          size="sm"
          :variant="model.direction === dir ? 'secondary' : 'outline'"
          @click="canvas.setDirection(dir)"
        >
          {{ dir }}
        </Button>
      </div>
    </div>

    <div v-if="canvas.selectedNode" class="grid shrink-0 gap-2 sm:grid-cols-[1fr_auto]">
      <Input
        :model-value="canvas.selectedNode.label"
        placeholder="Knotenlabel"
        @update:model-value="canvas.updateSelectedLabel(String($event))"
      />
      <select
        class="h-9 rounded-md border border-input bg-background px-2 text-sm"
        :value="canvas.selectedNode.shape ?? 'rect'"
        @change="
          canvas.updateSelectedShape(
            ($event.target as HTMLSelectElement).value as FlowchartNodeShape,
          )
        "
      >
        <option value="rect">Rechteck</option>
        <option value="round">Abgerundet</option>
        <option value="stadium">Stadium</option>
        <option value="diamond">Raute</option>
        <option value="circle">Kreis</option>
      </select>
    </div>

    <div
      :class="
        compact
          ? 'diagram-flow min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/20'
          : 'diagram-flow min-h-[240px] flex-1 overflow-hidden rounded-md border bg-muted/20'
      "
    >
      <VueFlow
        :nodes="canvas.flowNodes"
        :edges="canvas.flowEdges"
        :default-viewport="{ zoom: 0.9 }"
        :min-zoom="0.4"
        :max-zoom="1.8"
        fit-view-on-init
        nodes-draggable
        nodes-connectable
        pan-on-drag
        zoom-on-pinch
        @connect="canvas.onConnect"
        @node-click="canvas.onNodeClick"
      >
        <Background />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>
