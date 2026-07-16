<script setup lang="ts">
import DiagramKindToolbar from "@/components/workspace/diagram/DiagramKindToolbar.vue";
import DiagramActiveEditor from "@/components/workspace/diagram/DiagramActiveEditor.vue";
import DiagramPreviewPane from "@/components/workspace/diagram/DiagramPreviewPane.vue";
import type {
  ClassModel,
  DiagramKind,
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
  selectedKind: Exclude<DiagramKind, "raw">;
  showCode: boolean;
  rawText: string;
  previewSvg: string;
  previewError: string;
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
  "update:showCode": [value: boolean];
  switchKind: [kind: Exclude<DiagramKind, "raw">];
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
  <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
    <DiagramKindToolbar
      :selected-kind="selectedKind"
      :show-code="showCode"
      :compact="compact"
      @switch-kind="emit('switchKind', $event)"
      @update:show-code="emit('update:showCode', $event)"
    />
    <div
      :class="
        compact
          ? 'flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'
          : 'grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-2'
      "
    >
      <DiagramActiveEditor
        :model="model"
        :show-code="showCode"
        :raw-text="rawText"
        :compact="compact"
        :flowchart-model="flowchartModel"
        :state-model="stateModel"
        :sequence-model="sequenceModel"
        :class-model="classModel"
        :er-model="erModel"
        :gantt-model="ganttModel"
        :pie-model="pieModel"
        @raw-input="emit('rawInput', $event)"
        @update:flowchart-model="emit('update:flowchartModel', $event)"
        @update:state-model="emit('update:stateModel', $event)"
        @update:sequence-model="emit('update:sequenceModel', $event)"
        @update:class-model="emit('update:classModel', $event)"
        @update:er-model="emit('update:erModel', $event)"
        @update:gantt-model="emit('update:ganttModel', $event)"
        @update:pie-model="emit('update:pieModel', $event)"
      />
      <DiagramPreviewPane
        :preview-svg="previewSvg"
        :preview-error="previewError"
        :compact="compact"
      />
    </div>
  </div>
</template>
