<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ErModel, ErRelation } from "@/lib/mermaid/types";

const model = defineModel<ErModel>({ required: true });

let entityCounter = model.value.entities.length;

let relationCounter = model.value.relations.length;

function addEntity() {
  entityCounter += 1;
  const name = `ENTITY${entityCounter}`;

  model.value = {
    ...model.value,
    entities: [...model.value.entities, { id: name, name, attributes: [] }],
  };
}

function removeEntity(index: number) {
  const id = model.value.entities[index]?.id;

  model.value = {
    ...model.value,
    entities: model.value.entities.filter((_, i) => i !== index),
    relations: model.value.relations.filter(
      (relation) => relation.from !== id && relation.to !== id,
    ),
  };
}

function updateEntity(index: number, patch: Partial<{ name: string; attributesText: string }>) {
  model.value = {
    ...model.value,
    entities: model.value.entities.map((entity, i) => {
      if (i !== index) {
        return entity;
      }

      const name = patch.name ?? entity.name;

      return {
        id: name,
        name,
        attributes:
          patch.attributesText !== undefined
            ? patch.attributesText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
            : entity.attributes,
      };
    }),
  };
}

function addRelation() {
  const from = model.value.entities[0]?.id;

  const to = model.value.entities[1]?.id ?? from;

  if (!from || !to) {
    return;
  }

  relationCounter += 1;
  model.value = {
    ...model.value,
    relations: [
      ...model.value.relations,
      { id: `r${relationCounter}`, from, to, cardinality: "||--o{", label: "" },
    ],
  };
}

function removeRelation(index: number) {
  model.value = {
    ...model.value,
    relations: model.value.relations.filter((_, i) => i !== index),
  };
}

function updateRelation(index: number, patch: Partial<ErRelation>) {
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
        <h3 class="text-sm font-medium">Entitäten</h3>
        <Button type="button" size="sm" @click="addEntity">Hinzufügen</Button>
      </div>
      <div
        v-for="(entity, index) in model.entities"
        :key="entity.id"
        class="space-y-2 rounded-md border p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <Input
            class="min-w-[8rem] flex-1"
            :model-value="entity.name"
            placeholder="Entitätsname"
            @update:model-value="updateEntity(index, { name: String($event) })"
          />
          <Button type="button" size="sm" variant="ghost" @click="removeEntity(index)">
            Entfernen
          </Button>
        </div>
        <Textarea
          :model-value="entity.attributes.join('\n')"
          placeholder="Attribute (eine Zeile pro Eintrag, z. B. string name)"
          rows="3"
          @update:model-value="updateEntity(index, { attributesText: String($event) })"
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
          <option v-for="entity in model.entities" :key="entity.id" :value="entity.id">
            {{ entity.name }}
          </option>
        </select>
        <Input
          class="w-28"
          :model-value="relation.cardinality"
          placeholder="||--o{"
          @update:model-value="updateRelation(index, { cardinality: String($event) })"
        />
        <select
          class="h-9 rounded-md border border-input bg-background px-2 text-sm"
          :value="relation.to"
          @change="updateRelation(index, { to: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="entity in model.entities" :key="entity.id" :value="entity.id">
            {{ entity.name }}
          </option>
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
