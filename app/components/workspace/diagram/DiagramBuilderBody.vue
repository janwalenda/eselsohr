<script setup lang="ts">
import { Button } from "@/components/ui/button";
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

const props = defineProps<{
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

/** On mobile, editor and preview share one screen via toggle. */
const mobilePane = ref<"edit" | "preview">("edit");

watch(
  () => [props.showCode, props.selectedKind] as const,
  () => {
    mobilePane.value = "edit";
  },
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
    <DiagramKindToolbar
      :selected-kind="selectedKind"
      :show-code="showCode"
      :compact="compact"
      @switch-kind="emit('switchKind', $event)"
      @update:show-code="emit('update:showCode', $event)"
    />

    <div
      v-if="compact"
      class="flex shrink-0 gap-1 rounded-md border bg-muted/40 p-1"
      role="tablist"
      aria-label="Diagrammansicht"
    >
      <Button
        type="button"
        size="sm"
        class="flex-1"
        :variant="mobilePane === 'edit' ? 'secondary' : 'ghost'"
        role="tab"
        :aria-selected="mobilePane === 'edit'"
        @click="mobilePane = 'edit'"
      >
        Bearbeiten
      </Button>
      <Button
        type="button"
        size="sm"
        class="flex-1"
        :variant="mobilePane === 'preview' ? 'secondary' : 'ghost'"
        role="tab"
        :aria-selected="mobilePane === 'preview'"
        @click="mobilePane = 'preview'"
      >
        Vorschau
      </Button>
    </div>

    <div
      :class="
        compact
          ? 'relative min-h-0 flex-1 overflow-hidden'
          : 'grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-2'
      "
    >
      <div
        :class="
          compact
            ? [
                'absolute inset-0 flex flex-col',
                mobilePane !== 'edit' && 'invisible pointer-events-none',
              ]
            : 'contents'
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
      </div>
      <div
        :class="
          compact
            ? [
                'absolute inset-0 flex flex-col',
                mobilePane !== 'preview' && 'invisible pointer-events-none',
              ]
            : 'contents'
        "
      >
        <DiagramPreviewPane
          :preview-svg="previewSvg"
          :preview-error="previewError"
          :compact="compact"
        />
      </div>
    </div>
  </div>
</template>
