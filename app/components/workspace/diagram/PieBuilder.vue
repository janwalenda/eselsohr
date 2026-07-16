<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PieModel } from "@/lib/mermaid/types";

const model = defineModel<PieModel>({ required: true });

let sliceCounter = model.value.slices.length;

function addSlice() {
  sliceCounter += 1;
  model.value = {
    ...model.value,
    slices: [
      ...model.value.slices,
      { id: `s${sliceCounter}`, label: `Segment ${sliceCounter}`, value: 10 },
    ],
  };
}

function removeSlice(index: number) {
  model.value = {
    ...model.value,
    slices: model.value.slices.filter((_, i) => i !== index),
  };
}

function updateSlice(index: number, patch: Partial<PieModel["slices"][number]>) {
  model.value = {
    ...model.value,
    slices: model.value.slices.map((slice, i) => (i === index ? { ...slice, ...patch } : slice)),
  };
}
</script>

<template>
  <div class="space-y-4">
    <Input
      :model-value="model.title"
      placeholder="Titel"
      @update:model-value="model = { ...model, title: String($event) }"
    />

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Segmente</h3>
        <Button type="button" size="sm" @click="addSlice">Hinzufügen</Button>
      </div>
      <div
        v-for="(slice, index) in model.slices"
        :key="slice.id"
        class="flex flex-wrap items-center gap-2"
      >
        <Input
          class="min-w-[8rem] flex-1"
          :model-value="slice.label"
          placeholder="Label"
          @update:model-value="updateSlice(index, { label: String($event) })"
        />
        <Input
          class="w-24"
          type="number"
          :model-value="slice.value"
          placeholder="Wert"
          @update:model-value="updateSlice(index, { value: Number($event) || 0 })"
        />
        <Button type="button" size="sm" variant="ghost" @click="removeSlice(index)">
          Entfernen
        </Button>
      </div>
    </div>
  </div>
</template>
