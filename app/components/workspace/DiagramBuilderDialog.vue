<script setup lang="ts">
import DiagramBuilderBody from "@/components/workspace/diagram/DiagramBuilderBody.vue";
import DiagramBuilderMobile from "@/components/workspace/diagram/DiagramBuilderMobile.vue";
import DiagramBuilderDesktop from "@/components/workspace/diagram/DiagramBuilderDesktop.vue";
import { useDiagramBuilderDialog } from "@/composables/useDiagramBuilderDialog";

const open = defineModel<boolean>("open", { required: true });

const props = withDefaults(
  defineProps<{
    source?: string;
    mode?: "insert" | "edit";
  }>(),
  {
    source: "",
    mode: "insert",
  },
);

const emit = defineEmits<{
  confirm: [source: string];
}>();

const builder = reactive(
  useDiagramBuilderDialog({
    open,
    source: () => props.source,
    mode: () => props.mode,
    onConfirm: (source) => emit("confirm", source),
  }),
);
</script>

<template>
  <DiagramBuilderMobile
    v-if="builder.isMobile"
    :open="open"
    :title="builder.title"
    @update:open="builder.setOpen"
    @confirm="builder.confirm"
    @cancel="builder.setOpen(false)"
  >
    <DiagramBuilderBody
      compact
      :model="builder.model"
      :selected-kind="builder.selectedKind"
      :show-code="builder.showCode"
      :raw-text="builder.rawText"
      :preview-svg="builder.previewSvg"
      :preview-error="builder.previewError"
      :flowchart-model="builder.flowchartModel"
      :state-model="builder.stateModel"
      :sequence-model="builder.sequenceModel"
      :class-model="builder.classModel"
      :er-model="builder.erModel"
      :gantt-model="builder.ganttModel"
      :pie-model="builder.pieModel"
      @update:show-code="builder.showCode = $event"
      @switch-kind="builder.switchKind"
      @raw-input="builder.onRawInput"
      @update:flowchart-model="builder.flowchartModel = $event"
      @update:state-model="builder.stateModel = $event"
      @update:sequence-model="builder.sequenceModel = $event"
      @update:class-model="builder.classModel = $event"
      @update:er-model="builder.erModel = $event"
      @update:gantt-model="builder.ganttModel = $event"
      @update:pie-model="builder.pieModel = $event"
    />
  </DiagramBuilderMobile>

  <DiagramBuilderDesktop
    v-else
    :open="open"
    :title="builder.title"
    @update:open="builder.setOpen"
    @confirm="builder.confirm"
    @cancel="builder.setOpen(false)"
  >
    <DiagramBuilderBody
      :model="builder.model"
      :selected-kind="builder.selectedKind"
      :show-code="builder.showCode"
      :raw-text="builder.rawText"
      :preview-svg="builder.previewSvg"
      :preview-error="builder.previewError"
      :flowchart-model="builder.flowchartModel"
      :state-model="builder.stateModel"
      :sequence-model="builder.sequenceModel"
      :class-model="builder.classModel"
      :er-model="builder.erModel"
      :gantt-model="builder.ganttModel"
      :pie-model="builder.pieModel"
      @update:show-code="builder.showCode = $event"
      @switch-kind="builder.switchKind"
      @raw-input="builder.onRawInput"
      @update:flowchart-model="builder.flowchartModel = $event"
      @update:state-model="builder.stateModel = $event"
      @update:sequence-model="builder.sequenceModel = $event"
      @update:class-model="builder.classModel = $event"
      @update:er-model="builder.erModel = $event"
      @update:gantt-model="builder.ganttModel = $event"
      @update:pie-model="builder.pieModel = $event"
    />
  </DiagramBuilderDesktop>
</template>
