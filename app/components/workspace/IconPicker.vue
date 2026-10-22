<script setup lang="ts">
import { ref } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import IconPickerPanel from "@/components/workspace/IconPickerPanel.vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useIconPicker } from "@/composables/useIconPicker";

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    collectiveId?: number | null;
    ownerPageId?: number | null;
    deferImageUpload?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: null,
    collectiveId: null,
    ownerPageId: null,
    deferImageUpload: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  pendingImage: [blob: Blob | null];
}>();

const open = ref(false);

const {
  tab,
  emojiInput,
  lucideQuery,
  uploading,
  uploadError,
  previewUrl,
  lucidePreviews,
  filteredLucide,
  selectEmoji,
  selectLucide,
  clearIcon,
  onFileChange,
  applyEmojiInput,
} = useIconPicker({
  modelValue: () => props.modelValue,
  collectiveId: () => props.collectiveId,
  ownerPageId: () => props.ownerPageId,
  deferImageUpload: () => props.deferImageUpload,
  emit,
  close: () => {
    open.value = false;
  },
});
</script>

<template>
  <Dialog v-model:open="open" :modal="false">
    <DialogTrigger as-child>
      <Button type="button" variant="outline" size="sm" class="gap-2" :disabled="disabled">
        <AppIcon
          :icon="modelValue?.startsWith('image:pending') ? null : modelValue"
          :collective-id="collectiveId"
          :owner-page-id="ownerPageId"
          fallback-lucide="smile"
          class="size-4"
        />
        <span class="text-muted-foreground">Icon wählen</span>
      </Button>
    </DialogTrigger>

    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Icon wählen</DialogTitle>
        <DialogDescription>Emoji, Lucide-Icon oder zugeschnittenes Bild.</DialogDescription>
      </DialogHeader>

      <IconPickerPanel
        v-model:tab="tab"
        v-model:emoji-input="emojiInput"
        v-model:lucide-query="lucideQuery"
        :uploading="uploading"
        :upload-error="uploadError"
        :preview-url="previewUrl"
        :filtered-lucide="filteredLucide"
        :lucide-previews="lucidePreviews"
        @select-emoji="selectEmoji"
        @select-lucide="selectLucide"
        @apply-emoji="applyEmojiInput"
        @file-change="onFileChange"
        @clear="clearIcon"
      />
    </DialogContent>
  </Dialog>
</template>
