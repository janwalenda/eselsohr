<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COMMON_ICON_EMOJIS } from "@/composables/useIconPicker";

defineProps<{ emojiInput: string }>();

const emit = defineEmits<{
  "update:emojiInput": [value: string];
  selectEmoji: [emoji: string];
  applyEmoji: [];
}>();
</script>

<template>
  <div class="space-y-3">
    <div class="flex gap-2">
      <Input
        :model-value="emojiInput"
        placeholder="Emoji einfügen…"
        @update:model-value="emit('update:emojiInput', String($event))"
        @keydown.enter.prevent="emit('applyEmoji')"
      />
      <Button type="button" size="sm" @click="emit('applyEmoji')">OK</Button>
    </div>
    <div class="grid grid-cols-8 gap-1">
      <button
        v-for="emoji in COMMON_ICON_EMOJIS"
        :key="emoji"
        type="button"
        class="flex size-8 items-center justify-center rounded-md text-lg hover:bg-muted"
        @click="emit('selectEmoji', emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>
