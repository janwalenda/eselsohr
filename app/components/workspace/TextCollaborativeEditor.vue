<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
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
import { buildExtensions } from '@/lib/nc-text/editor/extensions'
import { serializeMarkdown } from '@/lib/nc-text/editor/markdown-serializer'
import { seedInitialContent } from '@/lib/nc-text/editor/seed'
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

const editor = useEditor({
  extensions: buildExtensions({
    document: session.ydoc,
    awareness: session.awareness,
    collectiveId: props.collectiveId,
    pageId: props.pageId,
  }),
  editorProps: {
    attributes: {
      class: 'nc-text-prose prose dark:prose-invert max-w-none min-h-[60vh] p-2 focus:outline-none',
    },
  },
})

watch(session.readOnly, (readOnly) => {
  editor.value?.setEditable(!readOnly)
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

function promptLink() {
  const href = window.prompt('Link-URL')
  if (!href) {
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
  // Store the relative attachment path; the node view resolves it for display.
  editor.value?.chain().focus().setImage({ src: result.path }).run()
}

function insertImage() {
  const input = window.document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) {
      void uploadImageFile(file).catch(() => {
        const src = window.prompt('Upload fehlgeschlagen. Bild-URL eingeben')
        if (src) {
          editor.value?.chain().focus().setImage({ src }).run()
        }
      })
    }
  }
  input.click()
}

onMounted(() => {
  session.connect({
    serialize: () => (editor.value ? serializeMarkdown(editor.value.state.doc) : ''),
    seedInitialContent,
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
        v-if="editor"
        class="flex flex-wrap items-center gap-1 rounded-lg border bg-background p-1"
      >
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('bold') }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleBold().run()">
          <BoldIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('italic') }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleItalic().run()">
          <ItalicIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('strike') }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleStrike().run()">
          <StrikethroughIcon class="size-4" />
        </Button>
        <Separator orientation="vertical" class="mx-1 h-6" />
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('heading', { level: 1 }) }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
          <Heading1Icon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('heading', { level: 2 }) }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
          <Heading2Icon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('heading', { level: 3 }) }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
          <Heading3Icon class="size-4" />
        </Button>
        <Separator orientation="vertical" class="mx-1 h-6" />
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('bulletList') }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleBulletList().run()">
          <ListIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('orderedList') }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleOrderedList().run()">
          <ListOrderedIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('taskList') }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleTaskList().run()">
          <ListChecksIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('blockquote') }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleBlockquote().run()">
          <QuoteIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :class="{ 'bg-accent': editor.isActive('codeBlock') }" :disabled="session.readOnly.value" @click="editor.chain().focus().toggleCodeBlock().run()">
          <Code2Icon class="size-4" />
        </Button>
        <Separator orientation="vertical" class="mx-1 h-6" />
        <Button variant="ghost" size="icon" :disabled="session.readOnly.value" @click="promptLink">
          <LinkIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :disabled="session.readOnly.value" @click="insertImage">
          <ImageIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :disabled="session.readOnly.value" @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
          <TableIcon class="size-4" />
        </Button>
        <Separator orientation="vertical" class="mx-1 h-6" />
        <Button variant="ghost" size="icon" :disabled="session.readOnly.value" @click="editor.chain().focus().undo().run()">
          <UndoIcon class="size-4" />
        </Button>
        <Button variant="ghost" size="icon" :disabled="session.readOnly.value" @click="editor.chain().focus().redo().run()">
          <RedoIcon class="size-4" />
        </Button>
      </div>

      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <span v-if="lastCollaborator" class="truncate">
          {{ lastCollaborator }}
        </span>
        <span>{{ statusLabel }}</span>
      </div>
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

    <div class="rounded-xl border bg-background p-2 shadow-sm">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>
