<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { DIAGRAM_KIND_LABELS, DIAGRAM_KINDS, type DiagramKind } from "@/lib/mermaid/types";

defineProps<{
  selectedKind: Exclude<DiagramKind, "raw">;
  showCode: boolean;
  compact?: boolean;
}>();

const emit = defineEmits<{
  switchKind: [kind: Exclude<DiagramKind, "raw">];
  "update:showCode": [value: boolean];
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <select
      v-if="compact"
      class="h-9 min-w-[10rem] flex-1 rounded-md border border-input bg-background px-2 text-sm"
      :value="selectedKind"
      @change="
        emit(
          'switchKind',
          ($event.target as HTMLSelectElement).value as Exclude<DiagramKind, 'raw'>,
        )
      "
    >
      <option v-for="kind in DIAGRAM_KINDS" :key="kind" :value="kind">
        {{ DIAGRAM_KIND_LABELS[kind] }}
      </option>
    </select>
    <ButtonGroup v-else class="flex-wrap">
      <Button
        v-for="kind in DIAGRAM_KINDS"
        :key="kind"
        type="button"
        size="sm"
        :variant="selectedKind === kind ? 'secondary' : 'outline'"
        @click="emit('switchKind', kind)"
      >
        {{ DIAGRAM_KIND_LABELS[kind] }}
      </Button>
    </ButtonGroup>
    <Button
      type="button"
      size="sm"
      variant="outline"
      :class="compact ? '' : 'ml-auto'"
      @click="emit('update:showCode', !showCode)"
    >
      {{ showCode ? "Builder" : "Code" }}
    </Button>
  </div>
</template>
