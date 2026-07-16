<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClassModel, ClassRelation } from "@/lib/mermaid/types";

const model = defineModel<ClassModel>({ required: true });

let classCounter = model.value.classes.length;

let relationCounter = model.value.relations.length;

function addClass() {
  classCounter += 1;
  const name = `Class${classCounter}`;

  model.value = {
    ...model.value,
    classes: [...model.value.classes, { id: name, name, members: [] }],
  };
}

function removeClass(index: number) {
  const id = model.value.classes[index]?.id;

  model.value = {
    ...model.value,
    classes: model.value.classes.filter((_, i) => i !== index),
    relations: model.value.relations.filter(
      (relation) => relation.from !== id && relation.to !== id,
    ),
  };
}

function updateClass(index: number, patch: Partial<{ name: string; membersText: string }>) {
  model.value = {
    ...model.value,
    classes: model.value.classes.map((cls, i) => {
      if (i !== index) {
        return cls;
      }

      const name = patch.name ?? cls.name;

      return {
        id: name,
        name,
        members:
          patch.membersText !== undefined
            ? patch.membersText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
            : cls.members,
      };
    }),
  };
}

function addRelation() {
  const from = model.value.classes[0]?.id;

  const to = model.value.classes[1]?.id ?? from;

  if (!from || !to) {
    return;
  }

  relationCounter += 1;
  model.value = {
    ...model.value,
    relations: [
      ...model.value.relations,
      { id: `r${relationCounter}`, from, to, type: "association", label: "" },
    ],
  };
}

function removeRelation(index: number) {
  model.value = {
    ...model.value,
    relations: model.value.relations.filter((_, i) => i !== index),
  };
}

function updateRelation(index: number, patch: Partial<ClassRelation>) {
  model.value = {
    ...model.value,
    relations: model.value.relations.map((relation, i) =>
      i === index ? { ...relation, ...patch } : relation,
    ),
  };
}
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Klassen</h3>
        <Button type="button" size="sm" @click="addClass">Hinzufügen</Button>
      </div>
      <div
        v-for="(cls, index) in model.classes"
        :key="cls.id"
        class="space-y-2 rounded-md border p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <Input
            class="min-w-[8rem] flex-1"
            :model-value="cls.name"
            placeholder="Klassenname"
            @update:model-value="updateClass(index, { name: String($event) })"
          />
          <Button type="button" size="sm" variant="ghost" @click="removeClass(index)">
            Entfernen
          </Button>
        </div>
        <Textarea
          :model-value="cls.members.join('\n')"
          placeholder="Mitglieder (eine Zeile pro Eintrag)"
          rows="3"
          @update:model-value="updateClass(index, { membersText: String($event) })"
        />
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Beziehungen</h3>
        <Button type="button" size="sm" @click="addRelation">Hinzufügen</Button>
      </div>
      <div
        v-for="(relation, index) in model.relations"
        :key="relation.id"
        class="flex flex-wrap items-center gap-2"
      >
        <select
          class="h-9 rounded-md border border-input bg-background px-2 text-sm"
          :value="relation.from"
          @change="updateRelation(index, { from: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="cls in model.classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
        </select>
        <select
          class="h-9 rounded-md border border-input bg-background px-2 text-sm"
          :value="relation.type"
          @change="
            updateRelation(index, {
              type: ($event.target as HTMLSelectElement).value as ClassRelation['type'],
            })
          "
        >
          <option value="association">Assoziation</option>
          <option value="inheritance">Vererbung</option>
          <option value="composition">Komposition</option>
          <option value="aggregation">Aggregation</option>
        </select>
        <select
          class="h-9 rounded-md border border-input bg-background px-2 text-sm"
          :value="relation.to"
          @change="updateRelation(index, { to: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="cls in model.classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
        </select>
        <Input
          class="min-w-[6rem] flex-1"
          :model-value="relation.label ?? ''"
          placeholder="Label"
          @update:model-value="updateRelation(index, { label: String($event) })"
        />
        <Button type="button" size="sm" variant="ghost" @click="removeRelation(index)">
          Entfernen
        </Button>
      </div>
    </div>
  </div>
</template>
