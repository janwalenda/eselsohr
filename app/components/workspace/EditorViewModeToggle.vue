<script setup lang="ts">
import { BookOpenIcon, Code2Icon, PencilIcon } from 'lucide-vue-next'
import { ButtonGroup } from '@/components/ui/button-group'

export type ViewMode = 'reading' | 'editing' | 'source'

const props = defineProps<{
  modelValue: ViewMode
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ViewMode]
}>()

const modes: { value: ViewMode, label: string, icon: typeof BookOpenIcon }[] = [
  { value: 'reading', label: 'Lesemodus', icon: BookOpenIcon },
  { value: 'editing', label: 'Bearbeiten', icon: PencilIcon },
  { value: 'source', label: 'Markdown-Quelltext', icon: Code2Icon },
]

function select(mode: ViewMode) {
  if (!props.disabled && mode !== props.modelValue) {
    emit('update:modelValue', mode)
  }
}
</script>

<template>
  <ButtonGroup>
    <Button
      v-for="mode in modes"
      :key="mode.value"
      type="button"
      size="icon"
      :variant="modelValue === mode.value ? 'secondary' : 'outline'"
      :disabled="disabled"
      :aria-label="mode.label"
      :title="mode.label"
      :aria-pressed="modelValue === mode.value"
      @click="select(mode.value)"
    >
      <component :is="mode.icon" class="size-4" />
    </Button>
  </ButtonGroup>
</template>
