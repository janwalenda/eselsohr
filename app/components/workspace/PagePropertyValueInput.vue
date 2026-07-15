<script setup lang="ts">
import { InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { PropertyDefinition, PropertyType } from "~~/shared/properties";

const props = defineProps<{
  definition: PropertyDefinition;
  index: number;
}>();

const emit = defineEmits<{
  update: [index: number, patch: Partial<PropertyDefinition>];
}>();

function listAsText(definition: PropertyDefinition) {
  return (Array.isArray(definition.value) ? definition.value : []).join(", ");
}

function updateListFromText(raw: string, type: PropertyType) {
  const items = raw
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim();

      return type === "tags" ? trimmed.replace(/^#/, "") : trimmed;
    })
    .filter(Boolean);

  emit("update", props.index, { ...props.definition, value: items, type });
}
</script>

<template>
  <InputGroupAddon v-if="definition.type === 'checkbox'" class="flex-1 justify-start border-l px-3">
    <label class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        data-slot="input-group-control"
        class="size-4 rounded border"
        :checked="Boolean(definition.value)"
        @change="
          emit('update', index, {
            value: ($event.target as HTMLInputElement).checked,
            type: 'checkbox',
          })
        "
      />
      <span>{{ definition.value ? "true" : "false" }}</span>
    </label>
  </InputGroupAddon>

  <InputGroupInput
    v-else-if="definition.type === 'number'"
    type="number"
    :model-value="String(definition.value ?? '')"
    @update:model-value="emit('update', index, { value: Number($event), type: 'number' })"
  />

  <InputGroupInput
    v-else-if="definition.type === 'date'"
    type="date"
    :model-value="String(definition.value ?? '')"
    @update:model-value="emit('update', index, { value: String($event), type: 'date' })"
  />

  <InputGroupInput
    v-else-if="definition.type === 'datetime'"
    type="datetime-local"
    :model-value="String(definition.value ?? '').replace('Z', '')"
    @update:model-value="emit('update', index, { value: String($event), type: 'datetime' })"
  />

  <InputGroupInput
    v-else-if="definition.type === 'list' || definition.type === 'tags'"
    :model-value="listAsText(definition)"
    :placeholder="definition.type === 'tags' ? 'tags, kommagetrennt' : 'Werte, kommagetrennt'"
    :list="definition.type === 'tags' ? 'known-tags' : undefined"
    @update:model-value="updateListFromText(String($event), definition.type)"
  />

  <InputGroupInput
    v-else
    :model-value="String(definition.value ?? '')"
    placeholder="Wert"
    @update:model-value="emit('update', index, { value: String($event), type: 'text' })"
  />
</template>
