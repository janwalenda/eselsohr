<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import {
  BoldIcon,
  Code2Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  RedoIcon,
  StrikethroughIcon,
  TableIcon,
  UndoIcon,
} from 'lucide-vue-next'
import EditorViewModeToggle, { type ViewMode } from '@/components/workspace/EditorViewModeToggle.vue'
import { buildExtensions } from '@/lib/nc-text/editor/extensions'
import { APPLY_MARKDOWN_ORIGIN, applyMarkdownToYdoc } from '@/lib/nc-text/editor/apply-markdown'
import {
  insertImage,
  insertLink,
  insertTable,
  toggleBlockquote,
  toggleBulletList,
  toggleCodeBlock,
  toggleHeading,
  toggleOrderedList,
  toggleTaskList,
  wrapSelection,
} from '@/lib/nc-text/editor/markdown-insert'
import { serializeMarkdown } from '@/lib/nc-text/editor/markdown-serializer'
import { seedInitialContent } from '@/lib/nc-text/editor/seed'
import { shouldApplySourceMarkdownOnModeSwitch } from '@/lib/nc-text/editor/source-mode'
import { useTextSession } from '@/composables/useTextSession'

const props = defineProps<{
  collectiveId: number
  pageId: number
  userName: string
}>()

const emit = defineEmits<{
  'reload': []
}>()

function colorForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 45%)`
}

const session = useTextSession(props.collectiveId, props.pageId, {
  name: props.userName,
  color: colorForName(props.userName),
})

const apiFetch = useApiFetch()

const viewMode = ref<ViewMode>('editing')
const sourceMarkdown = ref('')
const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null)
const sourceRemoteStale = ref(false)

const editor = useEditor({
  extensions: buildExtensions({
    document: session.ydoc,
    awareness: session.awareness,
    collectiveId: props.collectiveId,
    pageId: props.pageId,
  }),
  editorProps: {
    attributes: {
      class: 'nc-text-prose prose dark:prose-invert max-w-none min-h-[60vh] px-0 py-2 focus:outline-none',
    },
    handleClick(_view, _pos, event) {
      if (event.button !== 0) {
        return false
      }

      const target = event.target
      if (!(target instanceof Element)) {
        return false
      }

      const link = target.closest('a[href]')
      if (!(link instanceof HTMLAnchorElement) || !link.href) {
        return false
      }

      const openForReading = viewMode.value === 'reading' || session.readOnly.value
      const openWithModifier = event.metaKey || event.ctrlKey

      if (openForReading || openWithModifier) {
        window.open(link.href, link.target || '_blank', 'noopener,noreferrer')
        return true
      }

      return false
    },
  },
})

const isContentEditable = computed(() =>
  !session.readOnly.value && viewMode.value !== 'reading',
)

watch(isContentEditable, (editable) => {
  editor.value?.setEditable(editable)
}, { immediate: true })

const lastCollaborator = computed(() => {
  const latestSession = session.collaborators.value.reduce((latest, current) => {
    return !latest || current.lastContact > latest.lastContact ? current : latest
  }, null as (typeof session.collaborators.value)[number] | null)

  return latestSession?.displayName || latestSession?.guestName || latestSession?.userId || ''
})

const statusLabel = computed(() => {
  if (session.status.value === 'error') {
    return session.expired.value ? 'Sitzung abgelaufen' : 'Verbindungsfehler'
  }
  if (session.connectionIssue.value) {
    return 'Verbindung unterbrochen …'
  }
  if (session.saving.value) {
    return 'Speichert …'
  }
  if (session.status.value === 'readonly') {
    return 'Schreibgeschützt'
  }
  if (session.status.value === 'connecting') {
    return 'Verbindet …'
  }
  if (session.dirty.value) {
    return 'Ungespeichert'
  }
  return 'Synchronisiert'
})

const toolbarDisabled = computed(() => session.readOnly.value)
const isSourceMode = computed(() => viewMode.value === 'source')
const showFormattingToolbar = computed(() => viewMode.value !== 'reading')

function sourceTextarea() {
  return sourceTextareaRef.value
}

function markDirty() {
  session.dirty.value = true
}

function onSourceInput() {
  markDirty()
}

function switchViewMode(next: ViewMode) {
  if (next === viewMode.value) {
    return
  }

  const previous = viewMode.value

  if (previous === 'source' && next !== 'source') {
    if (shouldApplySourceMarkdownOnModeSwitch(sourceRemoteStale.value)) {
      applyMarkdownToYdoc(session.ydoc, sourceMarkdown.value)
    }
    sourceRemoteStale.value = false
  }
  else if (previous !== 'source' && next === 'source') {
    if (editor.value) {
      sourceMarkdown.value = serializeMarkdown(editor.value.state.doc)
    }
    sourceRemoteStale.value = false
  }

  viewMode.value = next
}

function toggleBold() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      wrapSelection(textarea, '**')
    }
    return
  }
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      wrapSelection(textarea, '*')
    }
    return
  }
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleStrike() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      wrapSelection(textarea, '~~')
    }
    return
  }
  editor.value?.chain().focus().toggleStrike().run()
}

function setHeading(level: 1 | 2 | 3) {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      toggleHeading(textarea, level)
    }
    return
  }
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

function toggleBullet() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      toggleBulletList(textarea)
    }
    return
  }
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrdered() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      toggleOrderedList(textarea)
    }
    return
  }
  editor.value?.chain().focus().toggleOrderedList().run()
}

function toggleTask() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      toggleTaskList(textarea)
    }
    return
  }
  editor.value?.chain().focus().toggleTaskList().run()
}

function toggleQuote() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      toggleBlockquote(textarea)
    }
    return
  }
  editor.value?.chain().focus().toggleBlockquote().run()
}

function toggleCode() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      toggleCodeBlock(textarea)
    }
    return
  }
  editor.value?.chain().focus().toggleCodeBlock().run()
}

function promptLink() {
  const href = window.prompt('Link-URL')
  if (!href) {
    return
  }
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      insertLink(textarea, href)
    }
    return
  }
  editor.value?.chain().focus().toggleLink({ href }).run()
}

async function uploadImageFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  const result = await apiFetch<{ path: string }>(
    `/api/collectives/${props.collectiveId}/pages/${props.pageId}/attachments`,
    { method: 'POST', body: form },
  )
  return result.path
}

async function insertImageAction() {
  const input = window.document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) {
      return
    }
    void uploadImageFile(file).then((path) => {
      if (isSourceMode.value) {
        const textarea = sourceTextarea()
        if (textarea) {
          insertImage(textarea, path)
        }
        return
      }
      editor.value?.chain().focus().setImage({ src: path }).run()
    }).catch(() => {
      const src = window.prompt('Upload fehlgeschlagen. Bild-URL eingeben')
      if (!src) {
        return
      }
      if (isSourceMode.value) {
        const textarea = sourceTextarea()
        if (textarea) {
          insertImage(textarea, src)
        }
        return
      }
      editor.value?.chain().focus().setImage({ src }).run()
    })
  }
  input.click()
}

function insertTableAction() {
  if (isSourceMode.value) {
    const textarea = sourceTextarea()
    if (textarea) {
      insertTable(textarea)
    }
    return
  }
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

function serializeContent() {
  if (viewMode.value === 'source') {
    applyMarkdownToYdoc(session.ydoc, sourceMarkdown.value)
    return sourceMarkdown.value
  }
  return editor.value ? serializeMarkdown(editor.value.state.doc) : ''
}

onMounted(() => {
  session.connect({
    serialize: serializeContent,
    seedInitialContent,
  })
  session.ydoc.on('update', (_update, origin) => {
    if (viewMode.value === 'source' && origin !== APPLY_MARKDOWN_ORIGIN) {
      sourceRemoteStale.value = true
    }
  })
  window.addEventListener('beforeunload', saveBeforeUnload)
})

function saveBeforeUnload() {
  void session.save(true)
}

onBeforeUnmount(async () => {
  window.removeEventListener('beforeunload', saveBeforeUnload)
  await session.close()
  editor.value?.destroy()
})

defineExpose({ session })
</script>

<template>
  <div class="nc-text-editor flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div
        v-if="editor && showFormattingToolbar"
        class="flex flex-wrap items-center gap-1 rounded-lg border bg-background p-1"
      >
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('bold') }" :disabled="toolbarDisabled" @click="toggleBold">
          <BoldIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('italic') }" :disabled="toolbarDisabled" @click="toggleItalic">
          <ItalicIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('strike') }" :disabled="toolbarDisabled" @click="toggleStrike">
          <StrikethroughIcon class="size-4" />
        </Button>
        <Separator orientation="vertical" class="mx-1 h-6" />
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('heading', { level: 1 }) }" :disabled="toolbarDisabled" @click="setHeading(1)">
          <Heading1Icon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('heading', { level: 2 }) }" :disabled="toolbarDisabled" @click="setHeading(2)">
          <Heading2Icon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('heading', { level: 3 }) }" :disabled="toolbarDisabled" @click="setHeading(3)">
          <Heading3Icon class="size-4" />
        </Button>
        <Separator orientation="vertical" class="mx-1 h-6" />
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('bulletList') }" :disabled="toolbarDisabled" @click="toggleBullet">
          <ListIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('orderedList') }" :disabled="toolbarDisabled" @click="toggleOrdered">
          <ListOrderedIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('taskList') }" :disabled="toolbarDisabled" @click="toggleTask">
          <ListChecksIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('blockquote') }" :disabled="toolbarDisabled" @click="toggleQuote">
          <QuoteIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': !isSourceMode && editor.isActive('codeBlock') }" :disabled="toolbarDisabled" @click="toggleCode">
          <Code2Icon class="size-4" />
        </Button>
        <Separator orientation="vertical" class="mx-1 h-6" />
        <Button variant="ghost" size="icon" :disabled="toolbarDisabled" @click="promptLink">
          <LinkIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :disabled="toolbarDisabled" @click="insertImageAction">
          <ImageIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :disabled="toolbarDisabled" @click="insertTableAction">
          <TableIcon class="size-4" />
        </Button>
        <Separator orientation="vertical" class="mx-1 h-6" />
        <Button variant="ghost" size="icon" :disabled="toolbarDisabled || isSourceMode" @click="editor.chain().focus().undo().run()">
          <UndoIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :disabled="toolbarDisabled || isSourceMode" @click="editor.chain().focus().redo().run()">
          <RedoIcon class="size-4" />
        </Button>
      </div>

      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <span v-if="lastCollaborator" class="truncate">
          {{ lastCollaborator }}
        </span>
        <span>{{ statusLabel }}</span>
      </div>

      <div class="ml-auto flex items-center gap-3">
        <EditorViewModeToggle
          :model-value="viewMode"
          @update:model-value="switchViewMode"
        />
      </div>
    </div>

    <div
      v-if="sourceRemoteStale"
      class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      Die Seite wurde von einem anderen Nutzer geändert — bitte den Modus wechseln, um den Inhalt zu aktualisieren.
    </div>

    <div
      v-if="session.conflictContent.value"
      class="flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <span>Die Seite wurde außerhalb dieser Sitzung geändert.</span>
      <Button variant="outline" size="sm" @click="emit('reload')">
        Neu laden
      </Button>
    </div>

    <div
      v-if="session.expired.value"
      class="flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      <span>Die Bearbeitungssitzung ist abgelaufen.</span>
      <Button variant="outline" size="sm" @click="emit('reload')">
        Neu laden
      </Button>
    </div>

    <div
      v-if="viewMode === 'source'"
      class="rounded-xl border bg-background p-2 shadow-sm"
    >
      <textarea
        ref="sourceTextareaRef"
        v-model="sourceMarkdown"
        class="min-h-[60vh] w-full resize-y rounded-md bg-transparent p-2 font-mono text-sm leading-relaxed focus:outline-none"
        :readonly="toolbarDisabled"
        spellcheck="false"
        @input="onSourceInput"
      />
    </div>

    <div
      v-else
      :class="[
        'rounded-xl bg-background',
        viewMode === 'reading' ? 'mx-0 max-w-3xl border-0 p-0 shadow-none' : 'border p-2 shadow-sm',
      ]"
    >
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>
