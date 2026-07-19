<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SequenceModel } from "@/lib/mermaid/types";

const model = defineModel<SequenceModel>({ required: true });

let participantCounter = model.value.participants.length;

let messageCounter = model.value.messages.length;

function addParticipant() {
  participantCounter += 1;
  const id = `P${participantCounter}`;

  model.value = {
    ...model.value,
    participants: [...model.value.participants, { id, label: `Teilnehmer ${participantCounter}` }],
  };
}

function removeParticipant(index: number) {
  const id = model.value.participants[index]?.id;

  model.value = {
    ...model.value,
    participants: model.value.participants.filter((_, i) => i !== index),
    messages: model.value.messages.filter((message) => message.from !== id && message.to !== id),
  };
}

function updateParticipant(index: number, patch: Partial<SequenceModel["participants"][number]>) {
  model.value = {
    ...model.value,
    participants: model.value.participants.map((participant, i) =>
      i === index ? { ...participant, ...patch } : participant,
    ),
  };
}

function addMessage() {
  const from = model.value.participants[0]?.id;

  const to = model.value.participants[1]?.id ?? from;

  if (!from || !to) {
    return;
  }

  messageCounter += 1;
  model.value = {
    ...model.value,
    messages: [
      ...model.value.messages,
      { id: `m${messageCounter}`, from, to, label: "Nachricht", dashed: false },
    ],
  };
}

function removeMessage(index: number) {
  model.value = {
    ...model.value,
    messages: model.value.messages.filter((_, i) => i !== index),
  };
}

function updateMessage(index: number, patch: Partial<SequenceModel["messages"][number]>) {
  model.value = {
    ...model.value,
    messages: model.value.messages.map((message, i) =>
      i === index ? { ...message, ...patch } : message,
    ),
  };
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Teilnehmer</h3>
        <Button type="button" size="sm" @click="addParticipant">Hinzufügen</Button>
      </div>
      <div
        v-for="(participant, index) in model.participants"
        :key="participant.id"
        class="flex flex-wrap items-center gap-2"
      >
        <Input
          class="min-w-[6rem] flex-1"
          :model-value="participant.id"
          placeholder="ID"
          @update:model-value="updateParticipant(index, { id: String($event) })"
        />
        <Input
          class="min-w-[8rem] flex-1"
          :model-value="participant.label"
          placeholder="Label"
          @update:model-value="updateParticipant(index, { label: String($event) })"
        />
        <Button type="button" size="sm" variant="ghost" @click="removeParticipant(index)">
          Entfernen
        </Button>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Nachrichten</h3>
        <Button type="button" size="sm" @click="addMessage">Hinzufügen</Button>
      </div>
      <div
        v-for="(message, index) in model.messages"
        :key="message.id"
        class="flex flex-wrap items-center gap-2"
      >
        <select
          class="h-9 rounded-md border border-input bg-background px-2 text-sm"
          :value="message.from"
          @change="updateMessage(index, { from: ($event.target as HTMLSelectElement).value })"
        >
          <option
            v-for="participant in model.participants"
            :key="participant.id"
            :value="participant.id"
          >
            {{ participant.label || participant.id }}
          </option>
        </select>
        <span class="text-muted-foreground">→</span>
        <select
          class="h-9 rounded-md border border-input bg-background px-2 text-sm"
          :value="message.to"
          @change="updateMessage(index, { to: ($event.target as HTMLSelectElement).value })"
        >
          <option
            v-for="participant in model.participants"
            :key="participant.id"
            :value="participant.id"
          >
            {{ participant.label || participant.id }}
          </option>
        </select>
        <Input
          class="min-w-[8rem] flex-1"
          :model-value="message.label"
          placeholder="Nachricht"
          @update:model-value="updateMessage(index, { label: String($event) })"
        />
        <label class="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            :checked="message.dashed"
            @change="updateMessage(index, { dashed: ($event.target as HTMLInputElement).checked })"
          />
          gestrichelt
        </label>
        <Button type="button" size="sm" variant="ghost" @click="removeMessage(index)">
          Entfernen
        </Button>
      </div>
    </div>
  </div>
</template>
