<script setup lang="ts">
import { PlusIcon, Trash2Icon } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
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

withDefaults(
  defineProps<{
    definitions: EditablePropertyDefinition[];
    knownTags?: string[];
    knownPropertyKeys?: string[];
  }>(),
  {
    knownTags: () => [],
    knownPropertyKeys: () => ["tags", "aliases", "cssclasses"],
  },
);

const emit = defineEmits<{
  add: [];
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

function listValue(definition: PropertyDefinition) {
  return Array.isArray(definition.value) ? definition.value : [];
}

function listAsText(definition: PropertyDefinition) {
  return listValue(definition).join(", ");
}

function updateListFromText(index: number, definition: PropertyDefinition, raw: string) {
  const items = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  emit("update", index, {
    ...definition,
    value: items,
    type: definition.type,
  });
}

function updateTagsFromText(index: number, definition: PropertyDefinition, raw: string) {
  const items = raw
    .split(",")
    .map((entry) => entry.trim().replace(/^#/, ""))
    .filter(Boolean);

  emit("update", index, {
    ...definition,
    value: items,
    type: "tags",
  });
}
</script>

<template>
  <section class="rounded-lg bg-muted/30 p-3">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-sm font-medium">Properties</h2>
      <Button type="button" size="sm" @click="emit('add')">
        <PlusIcon class="size-4" />
        Property hinzufügen
      </Button>
    </div>

    <datalist id="known-property-keys">
      <option v-for="key in knownPropertyKeys" :key="key" :value="key" />
    </datalist>

    <datalist id="known-tags">
      <option v-for="tag in knownTags" :key="tag" :value="tag" />
    </datalist>

    <div v-if="definitions.length === 0" class="text-sm text-muted-foreground">
      Noch keine Properties. Füge z. B. <code class="text-xs">tags</code> hinzu.
    </div>

    <div v-else class="flex flex-col">
      <InputGroup v-for="(definition, index) in definitions" :key="definition.id" class="my-2">
        <InputGroupInput
          :model-value="definition.key"
          placeholder="name"
          list="known-property-keys"
          class="w-28 shrink-0"
          @update:model-value="emit('update', index, { key: String($event) })"
        />
        <Separator orientation="vertical" />

        <InputGroupAddon class="px-0">
          <select
            data-slot="input-group-control"
            class="h-9 cursor-pointer border-0 bg-transparent py-1 pr-7 pl-2 text-sm outline-none w-28"
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
        </InputGroupAddon>

        <InputGroupAddon
          v-if="definition.type === 'checkbox'"
          class="flex-1 justify-start border-l px-3"
        >
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
          v-else-if="definition.type === 'list'"
          :model-value="listAsText(definition)"
          placeholder="Werte, kommagetrennt"
          @update:model-value="updateListFromText(index, definition, String($event))"
        />

        <InputGroupInput
          v-else-if="definition.type === 'tags'"
          :model-value="listAsText(definition)"
          placeholder="tags, kommagetrennt"
          list="known-tags"
          @update:model-value="updateTagsFromText(index, definition, String($event))"
        />

        <InputGroupInput
          v-else
          :model-value="String(definition.value ?? '')"
          placeholder="Wert"
          @update:model-value="emit('update', index, { value: String($event), type: 'text' })"
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
    </div>
  </section>
</template>
