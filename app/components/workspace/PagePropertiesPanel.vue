<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import type { EditablePropertyDefinition, PropertyDefinition } from "~~/shared/properties";
import PagePropertyRow from "@/components/workspace/PagePropertyRow.vue";

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
      <PagePropertyRow
        v-for="(definition, index) in definitions"
        :key="definition.id"
        :definition="definition"
        :index="index"
        @update="(i, patch) => emit('update', i, patch)"
        @remove="(i) => emit('remove', i)"
      />
    </div>
  </section>
</template>
