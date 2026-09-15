<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StateModel } from "@/lib/mermaid/types";

const model = defineModel<StateModel>({ required: true });

let stateCounter = model.value.states.length;

let transitionCounter = model.value.transitions.length;

function addState() {
  stateCounter += 1;
  const id = `S${stateCounter}`;

  model.value = {
    ...model.value,
    states: [...model.value.states, { id, label: `Zustand ${stateCounter}` }],
  };
}

function removeState(index: number) {
  const id = model.value.states[index]?.id;

  model.value = {
    ...model.value,
    states: model.value.states.filter((_, i) => i !== index),
    transitions: model.value.transitions.filter(
      (transition) => transition.source !== id && transition.target !== id,
    ),
  };
}

function updateState(index: number, patch: Partial<StateModel["states"][number]>) {
  model.value = {
    ...model.value,
    states: model.value.states.map((state, i) => (i === index ? { ...state, ...patch } : state)),
  };
}

function addTransition() {
  const source = model.value.states[0]?.id;

  const target = model.value.states[1]?.id ?? source;

  if (!source || !target) {
    return;
  }

  transitionCounter += 1;
  model.value = {
    ...model.value,
    transitions: [
      ...model.value.transitions,
      { id: `t${transitionCounter}`, source, target, label: "" },
    ],
  };
}

function removeTransition(index: number) {
  model.value = {
    ...model.value,
    transitions: model.value.transitions.filter((_, i) => i !== index),
  };
}

function updateTransition(index: number, patch: Partial<StateModel["transitions"][number]>) {
  model.value = {
    ...model.value,
    transitions: model.value.transitions.map((transition, i) =>
      i === index ? { ...transition, ...patch } : transition,
    ),
  };
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Zustände</h3>
        <Button type="button" size="sm" @click="addState">Hinzufügen</Button>
      </div>
      <div
        v-for="(state, index) in model.states"
        :key="state.id"
        class="flex flex-wrap items-center gap-2"
      >
        <Input
          class="min-w-[6rem] flex-1"
          :model-value="state.id"
          placeholder="ID"
          @update:model-value="updateState(index, { id: String($event) })"
        />
        <Input
          class="min-w-[8rem] flex-1"
          :model-value="state.label"
          placeholder="Label"
          @update:model-value="updateState(index, { label: String($event) })"
        />
        <Button type="button" size="sm" variant="ghost" @click="removeState(index)"
          >Entfernen</Button
        >
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Übergänge</h3>
        <Button type="button" size="sm" @click="addTransition">Hinzufügen</Button>
      </div>
      <div
        v-for="(transition, index) in model.transitions"
        :key="transition.id"
        class="flex flex-wrap items-center gap-2"
      >
        <select
          class="h-9 rounded-md border border-input bg-background px-2 text-sm"
          :value="transition.source"
          @change="updateTransition(index, { source: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="state in model.states" :key="state.id" :value="state.id">
            {{ state.label || state.id }}
          </option>
        </select>
        <span class="text-muted-foreground">→</span>
        <select
          class="h-9 rounded-md border border-input bg-background px-2 text-sm"
          :value="transition.target"
          @change="updateTransition(index, { target: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="state in model.states" :key="state.id" :value="state.id">
            {{ state.label || state.id }}
          </option>
        </select>
        <Input
          class="min-w-[8rem] flex-1"
          :model-value="transition.label ?? ''"
          placeholder="Label"
          @update:model-value="updateTransition(index, { label: String($event) })"
        />
        <Button type="button" size="sm" variant="ghost" @click="removeTransition(index)">
          Entfernen
        </Button>
      </div>
    </div>
  </div>
</template>
