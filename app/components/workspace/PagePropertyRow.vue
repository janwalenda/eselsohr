<script setup lang="ts">
import { Trash2Icon } from "lucide-vue-next";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import type {
  EditablePropertyDefinition,
  PropertyDefinition,
  PropertyType,
} from "~~/shared/properties";
import { Separator } from "@/components/ui/separator";
import PagePropertyValueInput from "@/components/workspace/PagePropertyValueInput.vue";

defineProps<{
  definition: EditablePropertyDefinition;
  index: number;
}>();

const emit = defineEmits<{
  update: [index: number, patch: Partial<PropertyDefinition>];
  remove: [index: number];
}>();

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "list", label: "Liste" },
  { value: "tags", label: "Tags" },
  { value: "number", label: "Zahl" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Datum" },
  { value: "datetime", label: "Datum & Zeit" },
];
</script>

<template>
  <InputGroup class="my-2">
    <select
      data-slot="input-group-control"
      tabindex="0"
      class="h-9 w-28 cursor-pointer border-0 bg-transparent py-1 pr-7 pl-2 text-sm outline-none"
      :value="definition.type"
      @change="
        emit('update', index, {
          type: ($event.target as HTMLSelectElement).value as PropertyType,
        })
      "
    >
      <option v-for="option in propertyTypes" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <Separator orientation="vertical" />

    <InputGroupInput
      :model-value="definition.key"
      placeholder="name"
      list="known-property-keys"
      class="w-28 shrink-0"
      @update:model-value="emit('update', index, { key: String($event) })"
    />
    <Separator orientation="vertical" />

    <PagePropertyValueInput
      :definition="definition"
      :index="index"
      @update="(i, patch) => emit('update', i, patch)"
    />

    <InputGroupAddon align="inline-end">
      <InputGroupButton
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Property entfernen"
        @click="emit('remove', index)"
      >
        <Trash2Icon class="size-4" />
      </InputGroupButton>
    </InputGroupAddon>
  </InputGroup>
</template>
