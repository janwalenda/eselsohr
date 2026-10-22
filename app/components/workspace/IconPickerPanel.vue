<script setup lang="ts">
import type { Component } from "vue";
import { ImageIcon, SmileIcon, Trash2Icon } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import IconPickerEmojiTab from "@/components/workspace/IconPickerEmojiTab.vue";
import IconPickerLucideTab from "@/components/workspace/IconPickerLucideTab.vue";
import IconPickerImageTab from "@/components/workspace/IconPickerImageTab.vue";
import type { IconPickerTab } from "@/composables/useIconPicker";

defineProps<{
  tab: IconPickerTab;
  emojiInput: string;
  lucideQuery: string;
  uploading: boolean;
  uploadError: string;
  previewUrl: string | null;
  filteredLucide: readonly string[];
  lucidePreviews: Map<string, Component>;
}>();

const emit = defineEmits<{
  "update:tab": [value: IconPickerTab];
  "update:emojiInput": [value: string];
  "update:lucideQuery": [value: string];
  selectEmoji: [emoji: string];
  selectLucide: [name: string];
  applyEmoji: [];
  fileChange: [event: Event];
  clear: [];
}>();
</script>

<template>
  <div class="space-y-3">
    <div class="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        class="flex-1"
        :class="tab === 'emoji' ? 'bg-muted' : ''"
        @click="emit('update:tab', 'emoji')"
      >
        <SmileIcon class="size-3.5" /> Emoji
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        class="flex-1"
        :class="tab === 'lucide' ? 'bg-muted' : ''"
        @click="emit('update:tab', 'lucide')"
      >
        Icon
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        class="flex-1"
        :class="tab === 'image' ? 'bg-muted' : ''"
        @click="emit('update:tab', 'image')"
      >
        <ImageIcon class="size-3.5" /> Bild
      </Button>
    </div>

    <IconPickerEmojiTab
      v-if="tab === 'emoji'"
      :emoji-input="emojiInput"
      @update:emoji-input="emit('update:emojiInput', $event)"
      @select-emoji="emit('selectEmoji', $event)"
      @apply-emoji="emit('applyEmoji')"
    />
    <IconPickerLucideTab
      v-else-if="tab === 'lucide'"
      :lucide-query="lucideQuery"
      :filtered-lucide="filteredLucide"
      :lucide-previews="lucidePreviews"
      @update:lucide-query="emit('update:lucideQuery', $event)"
      @select-lucide="emit('selectLucide', $event)"
    />
    <IconPickerImageTab
      v-else
      :uploading="uploading"
      :upload-error="uploadError"
      :preview-url="previewUrl"
      @file-change="emit('fileChange', $event)"
    />

    <Button type="button" variant="ghost" size="sm" class="gap-1" @click="emit('clear')">
      <Trash2Icon class="size-3.5" /> Entfernen
    </Button>
  </div>
</template>
