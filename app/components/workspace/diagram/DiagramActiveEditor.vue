<script setup lang="ts">
import { Textarea } from "@/components/ui/textarea";
import FlowchartCanvas from "@/components/workspace/diagram/FlowchartCanvas.vue";
import StateBuilder from "@/components/workspace/diagram/StateBuilder.vue";
import SequenceBuilder from "@/components/workspace/diagram/SequenceBuilder.vue";
import ClassBuilder from "@/components/workspace/diagram/ClassBuilder.vue";
import ErBuilder from "@/components/workspace/diagram/ErBuilder.vue";
import GanttBuilder from "@/components/workspace/diagram/GanttBuilder.vue";
import PieBuilder from "@/components/workspace/diagram/PieBuilder.vue";
import type {
  ClassModel,
  DiagramModel,
  ErModel,
  FlowchartModel,
  GanttModel,
  PieModel,
  SequenceModel,
  StateModel,
} from "@/lib/mermaid/types";

defineProps<{
  model: DiagramModel;
  showCode: boolean;
  rawText: string;
  compact?: boolean;
  flowchartModel: FlowchartModel;
  stateModel: StateModel;
  sequenceModel: SequenceModel;
  classModel: ClassModel;
  erModel: ErModel;
  ganttModel: GanttModel;
  pieModel: PieModel;
}>();

const emit = defineEmits<{
  rawInput: [value: string];
  "update:flowchartModel": [value: FlowchartModel];
  "update:stateModel": [value: StateModel];
  "update:sequenceModel": [value: SequenceModel];
  "update:classModel": [value: ClassModel];
  "update:erModel": [value: ErModel];
  "update:ganttModel": [value: GanttModel];
  "update:pieModel": [value: PieModel];
}>();
</script>

<template>
  <div
    :class="
      compact
        ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border p-2'
        : 'min-h-0 overflow-auto rounded-md border p-3'
    "
  >
    <Textarea
      v-if="showCode || model.kind === 'raw'"
      :model-value="rawText"
      :class="
        compact ? 'min-h-0 flex-1 resize-none font-mono text-sm' : 'min-h-[320px] font-mono text-sm'
      "
      @update:model-value="emit('rawInput', String($event))"
    />
    <FlowchartCanvas
      v-else-if="model.kind === 'flowchart'"
      :model-value="flowchartModel"
      :compact="compact"
      @update:model-value="emit('update:flowchartModel', $event)"
    />
    <div v-else :class="compact ? 'min-h-0 flex-1 overflow-auto' : ''">
      <StateBuilder
        v-if="model.kind === 'state'"
        :model-value="stateModel"
        @update:model-value="emit('update:stateModel', $event)"
      />
      <SequenceBuilder
        v-else-if="model.kind === 'sequence'"
        :model-value="sequenceModel"
        @update:model-value="emit('update:sequenceModel', $event)"
      />
      <ClassBuilder
        v-else-if="model.kind === 'class'"
        :model-value="classModel"
        @update:model-value="emit('update:classModel', $event)"
      />
      <ErBuilder
        v-else-if="model.kind === 'er'"
        :model-value="erModel"
        @update:model-value="emit('update:erModel', $event)"
      />
      <GanttBuilder
        v-else-if="model.kind === 'gantt'"
        :model-value="ganttModel"
        @update:model-value="emit('update:ganttModel', $event)"
      />
      <PieBuilder
        v-else-if="model.kind === 'pie'"
        :model-value="pieModel"
        @update:model-value="emit('update:pieModel', $event)"
      />
    </div>
  </div>
</template>
