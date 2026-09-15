<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GanttModel } from "@/lib/mermaid/types";

const model = defineModel<GanttModel>({ required: true });

let taskCounter = model.value.tasks.length;

function addTask() {
  taskCounter += 1;
  model.value = {
    ...model.value,
    tasks: [
      ...model.value.tasks,
      {
        id: `t${taskCounter}`,
        section: model.value.tasks.at(-1)?.section || "Phase 1",
        name: `Aufgabe ${taskCounter}`,
        start: "2026-01-01",
        end: "2026-01-07",
      },
    ],
  };
}

function removeTask(index: number) {
  model.value = {
    ...model.value,
    tasks: model.value.tasks.filter((_, i) => i !== index),
  };
}

function updateTask(index: number, patch: Partial<GanttModel["tasks"][number]>) {
  model.value = {
    ...model.value,
    tasks: model.value.tasks.map((task, i) => (i === index ? { ...task, ...patch } : task)),
  };
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-2 sm:grid-cols-2">
      <Input
        :model-value="model.title"
        placeholder="Titel"
        @update:model-value="model = { ...model, title: String($event) }"
      />
      <Input
        :model-value="model.dateFormat"
        placeholder="Datumsformat"
        @update:model-value="model = { ...model, dateFormat: String($event) }"
      />
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Aufgaben</h3>
        <Button type="button" size="sm" @click="addTask">Hinzufügen</Button>
      </div>
      <div
        v-for="(task, index) in model.tasks"
        :key="task.id"
        class="grid gap-2 rounded-md border p-3 sm:grid-cols-2"
      >
        <Input
          :model-value="task.section"
          placeholder="Sektion"
          @update:model-value="updateTask(index, { section: String($event) })"
        />
        <Input
          :model-value="task.name"
          placeholder="Name"
          @update:model-value="updateTask(index, { name: String($event) })"
        />
        <Input
          :model-value="task.start"
          placeholder="Start"
          @update:model-value="updateTask(index, { start: String($event) })"
        />
        <Input
          :model-value="task.end"
          placeholder="Ende"
          @update:model-value="updateTask(index, { end: String($event) })"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          class="sm:col-span-2"
          @click="removeTask(index)"
        >
          Entfernen
        </Button>
      </div>
    </div>
  </div>
</template>
