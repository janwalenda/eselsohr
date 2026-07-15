<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import type { ViewMode } from "@/components/workspace/EditorViewModeToggle.vue";
import { EditorContent } from "@tiptap/vue-3";

defineProps<{
  viewMode: ViewMode;
  editor: Editor | undefined;
  toolbarDisabled: boolean;
  sourceEditorRef: HTMLDivElement | null;
}>();

const emit = defineEmits<{
  sourceInput: [];
  "update:sourceEditorRef": [value: HTMLDivElement | null];
}>();

function setSourceEditorRef(el: unknown) {
  emit("update:sourceEditorRef", el instanceof HTMLDivElement ? el : null);
}
</script>

<template>
  <div v-if="viewMode === 'source'" class="flex h-full justify-center">
    <div
      :ref="setSourceEditorRef"
      class="prose min-h-[60vh] w-full max-w-full rounded-md bg-transparent font-mono text-sm leading-relaxed wrap-break-word whitespace-pre-wrap focus:outline-none"
      role="textbox"
      aria-multiline="true"
      :contenteditable="toolbarDisabled ? 'false' : 'plaintext-only'"
      spellcheck="false"
      @input="emit('sourceInput')"
    />
  </div>

  <div v-else class="bg-background">
    <EditorContent :editor="editor" class="flex justify-center" />
  </div>
</template>
