<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import {
  AlertCircleIcon,
  BoldIcon,
  CircleCheckIcon,
  CircleDotIcon,
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
  Loader2Icon,
  LockIcon,
  QuoteIcon,
  RedoIcon,
  StrikethroughIcon,
  TableIcon,
  UndoIcon,
  WifiOffIcon,
} from "lucide-vue-next";
import type { Component } from "vue";
import EditorViewModeToggle, {
  type ViewMode,
} from "@/components/workspace/EditorViewModeToggle.vue";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildExtensions } from "@/lib/nc-text/editor/extensions";
import { APPLY_MARKDOWN_ORIGIN, applyMarkdownToYdoc } from "@/lib/nc-text/editor/apply-markdown";
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
} from "@/lib/nc-text/editor/markdown-insert";
import { serializeMarkdown } from "@/lib/nc-text/editor/markdown-serializer";
import { seedInitialContent } from "@/lib/nc-text/editor/seed";
import { shouldApplySourceMarkdownOnModeSwitch } from "@/lib/nc-text/editor/source-mode";
import { useTextSession } from "@/composables/useTextSession";
import { composeMarkdownFile, parseMarkdownFile } from "~~/shared/frontmatter";
import type { PageProperties } from "~~/shared/properties";
import type { CollectivePage } from "~~/shared/collectives";
import { resolveWikiLinkTarget } from "~~/shared/wiki-links";
import { createWikiLinkSuggestionRender } from "@/lib/nc-text/editor/wiki-link-suggestion-render";
import WikiLinkSuggestionList from "@/components/workspace/WikiLinkSuggestionList.vue";

const props = defineProps<{
  collectiveId: number;
  pageId: number;
  userName: string;
  properties: PageProperties;
  pages?: Pick<CollectivePage, "id" | "title">[];
}>();

const emit = defineEmits<{
  reload: [];
  "update:properties": [properties: PageProperties];
  wikiLinkClick: [payload: { target: string; resolvedPageId: number | null }];
}>();

function colorForName(name: string) {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return `hsl(${Math.abs(hash) % 360}, 70%, 45%)`;
}

const session = useTextSession(props.collectiveId, props.pageId, {
  name: props.userName,
  color: colorForName(props.userName),
});

const apiFetch = useApiFetch();

const viewMode = ref<ViewMode>("editing");

const sourceMarkdown = ref("");

const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null);

const sourceEditorRef = ref<HTMLDivElement | null>(null);

const sourceRemoteStale = ref(false);

const wikiLinkSuggestionRender = createWikiLinkSuggestionRender(WikiLinkSuggestionList);

function buildEditorExtensions() {
  return buildExtensions({
    document: session.ydoc,
    awareness: session.awareness,
    collectiveId: props.collectiveId,
    pageId: props.pageId,
    pages: props.pages ?? [],
    enableWikiLinkSuggestion: true,
    wikiLinkSuggestion: {
      render: wikiLinkSuggestionRender,
    },
  });
}

async function handleWikiLinkInteraction(
  wikiLinkElement: Element,
  openForReading: boolean,
  openWithModifier: boolean,
) {
  const target = wikiLinkElement.getAttribute("data-wiki-target")?.trim() ?? "";

  if (!target) {
    return false;
  }

  const pageIdAttr = wikiLinkElement.getAttribute("data-wiki-page-id");

  const resolvedPageId = pageIdAttr
    ? Number(pageIdAttr)
    : (resolveWikiLinkTarget(target, props.pages ?? [])?.id ?? null);

  const isBroken = resolvedPageId === null || !Number.isFinite(resolvedPageId);

  if (isBroken) {
    emit("wikiLinkClick", { target, resolvedPageId: null });
    return true;
  }

  if (openForReading || openWithModifier) {
    emit("wikiLinkClick", { target, resolvedPageId });
    return true;
  }

  return false;
}

const editor = useEditor({
  extensions: buildEditorExtensions(),
  editorProps: {
    attributes: {
      class:
        "prose prose-table:block prose-table:overflow-x-auto min-h-[60vh] max-w-full px-0 py-2 focus:outline-none w-full",
    },
    handleClick(_view, _pos, event) {
      if (event.button !== 0) {
        return false;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return false;
      }

      const wikiLink = target.closest("[data-wiki-link]");

      if (wikiLink) {
        event.preventDefault();

        const openForReading = viewMode.value === "reading" || session.readOnly.value;

        const openWithModifier = event.metaKey || event.ctrlKey;

        void handleWikiLinkInteraction(wikiLink, openForReading, openWithModifier);
        return true;
      }

      const link = target.closest("a[href]");

      if (!(link instanceof HTMLAnchorElement) || !link.href) {
        return false;
      }

      const openForReading = viewMode.value === "reading" || session.readOnly.value;

      const openWithModifier = event.metaKey || event.ctrlKey;

      if (openForReading || openWithModifier) {
        window.open(link.href, link.target || "_blank", "noopener,noreferrer");
        return true;
      }

      return false;
    },
  },
});

const isContentEditable = computed(() => !session.readOnly.value && viewMode.value !== "reading");

watch(
  isContentEditable,
  (editable) => {
    editor.value?.setEditable(editable);
  },
  { immediate: true },
);

watch(
  () => props.pages,
  (pages) => {
    const wikiLinkExtension = editor.value?.extensionManager.extensions.find(
      (extension) => extension.name === "wikiLink",
    );

    if (wikiLinkExtension) {
      wikiLinkExtension.options.pages = pages;
    }

    if (!editor.value) {
      return;
    }

    const { state } = editor.value;

    let transaction = state.tr;

    state.doc.descendants((node, pos) => {
      if (node.type.name === "wikiLink") {
        transaction = transaction.setNodeMarkup(pos, undefined, node.attrs);
      }
    });

    if (transaction.docChanged) {
      editor.value.view.dispatch(transaction);
    }
  },
  { deep: true },
);

function markDirty() {
  session.scheduleSave();
}

watch(
  () => props.properties,
  () => {
    if (viewMode.value !== "source") {
      return;
    }

    const parsed = parseMarkdownFile(sourceMarkdown.value);

    sourceMarkdown.value = composeMarkdownFile(props.properties, parsed.body);
    void nextTick(() => syncEditorFromMarkdown());
  },
  { deep: true },
);

const lastCollaborator = computed(() => {
  const latestSession = session.collaborators.value.reduce(
    (latest, current) => {
      return !latest || current.lastContact > latest.lastContact ? current : latest;
    },
    null as (typeof session.collaborators.value)[number] | null,
  );

  return latestSession?.displayName || latestSession?.guestName || latestSession?.userId || "";
});

type EditorStatus = {
  label: string;
  icon: Component;
  tone: "default" | "success" | "warning" | "error";
  spin?: boolean;
};

const editorStatus = computed((): EditorStatus => {
  if (session.status.value === "error") {
    return {
      label: session.expired.value ? "Sitzung abgelaufen" : "Verbindungsfehler",
      icon: AlertCircleIcon,
      tone: "error",
    };
  }

  if (session.connectionIssue.value) {
    return {
      label: "Verbindung unterbrochen …",
      icon: WifiOffIcon,
      tone: "warning",
    };
  }

  if (session.saving.value) {
    return {
      label: "Speichert …",
      icon: Loader2Icon,
      tone: "default",
      spin: true,
    };
  }

  if (session.status.value === "readonly") {
    return {
      label: "Schreibgeschützt",
      icon: LockIcon,
      tone: "warning",
    };
  }

  if (session.status.value === "connecting") {
    return {
      label: "Verbindet …",
      icon: Loader2Icon,
      tone: "default",
      spin: true,
    };
  }

  if (session.dirty.value) {
    return {
      label: "Ungespeichert",
      icon: CircleDotIcon,
      tone: "warning",
    };
  }

  return {
    label: "Synchronisiert",
    icon: CircleCheckIcon,
    tone: "success",
  };
});

const statusIconClass = computed(() => {
  switch (editorStatus.value.tone) {
    case "success":
      return "text-emerald-600 dark:text-emerald-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "error":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
});

const toolbarDisabled = computed(() => session.readOnly.value);

const isSourceMode = computed(() => viewMode.value === "source");

const showFormattingToolbar = computed(() => viewMode.value !== "reading");

function sourceTextarea() {
  return sourceTextareaRef.value;
}

function sourceEditor() {
  return sourceEditorRef.value;
}

function ensureSourceProxy() {
  let proxy = sourceTextarea();

  if (proxy) {
    return proxy;
  }

  proxy = window.document.createElement("textarea");
  proxy.spellcheck = false;
  sourceTextareaRef.value = proxy;
  return proxy;
}

function readEditorSelectionOffsets(editorEl: HTMLDivElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return { start: 0, end: 0 };
  }

  const range = selection.getRangeAt(0);

  if (!editorEl.contains(range.startContainer) || !editorEl.contains(range.endContainer)) {
    const length = editorEl.textContent?.length ?? 0;

    return { start: length, end: length };
  }

  const preStartRange = range.cloneRange();

  preStartRange.selectNodeContents(editorEl);
  preStartRange.setEnd(range.startContainer, range.startOffset);
  const start = preStartRange.toString().length;

  const preEndRange = range.cloneRange();

  preEndRange.selectNodeContents(editorEl);
  preEndRange.setEnd(range.endContainer, range.endOffset);
  const end = preEndRange.toString().length;

  return { start, end };
}

function setEditorSelectionOffsets(editorEl: HTMLDivElement, start: number, end: number) {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  if (!editorEl.firstChild) {
    editorEl.appendChild(window.document.createTextNode(""));
  }

  const range = window.document.createRange();

  const walker = window.document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();

  let position = 0;

  let startNode: Node | null = null;

  let startOffset = 0;

  let endNode: Node | null = null;

  let endOffset = 0;

  while (currentNode) {
    const textLength = currentNode.textContent?.length ?? 0;

    const nextPosition = position + textLength;

    if (!startNode && start <= nextPosition) {
      startNode = currentNode;
      startOffset = Math.max(0, start - position);
    }

    if (!endNode && end <= nextPosition) {
      endNode = currentNode;
      endOffset = Math.max(0, end - position);
    }

    if (startNode && endNode) {
      break;
    }

    position = nextPosition;
    currentNode = walker.nextNode();
  }

  const fallbackNode = editorEl.lastChild ?? editorEl;

  range.setStart(
    startNode ?? fallbackNode,
    startNode ? startOffset : (fallbackNode.textContent?.length ?? 0),
  );
  range.setEnd(
    endNode ?? fallbackNode,
    endNode ? endOffset : (fallbackNode.textContent?.length ?? 0),
  );

  selection.removeAllRanges();
  selection.addRange(range);
}

function syncProxyFromEditor() {
  const editorEl = sourceEditor();

  const proxy = ensureSourceProxy();

  if (!editorEl) {
    proxy.value = sourceMarkdown.value;
    proxy.setSelectionRange(sourceMarkdown.value.length, sourceMarkdown.value.length);
    return proxy;
  }

  const text = editorEl.textContent ?? "";

  const { start, end } = readEditorSelectionOffsets(editorEl);

  proxy.value = text;
  proxy.setSelectionRange(start, end);
  return proxy;
}

function syncEditorFromMarkdown(selection?: { start: number; end: number }) {
  const editorEl = sourceEditor();

  if (!editorEl) {
    return;
  }

  const nextText = sourceMarkdown.value;

  if ((editorEl.textContent ?? "") !== nextText) {
    editorEl.textContent = nextText;
  }

  if (selection) {
    editorEl.focus();
    setEditorSelectionOffsets(editorEl, selection.start, selection.end);
  }
}

function applySourceEdit(mutator: (textarea: HTMLTextAreaElement) => void) {
  const proxy = syncProxyFromEditor();

  mutator(proxy);
  sourceMarkdown.value = proxy.value;
  syncEditorFromMarkdown({
    start: proxy.selectionStart,
    end: proxy.selectionEnd,
  });
  markDirty();
}

function onSourceInput() {
  const editorEl = sourceEditor();

  sourceMarkdown.value = editorEl?.textContent ?? "";
  markDirty();
}

function switchViewMode(next: ViewMode) {
  if (next === viewMode.value) {
    return;
  }

  const previous = viewMode.value;

  if (previous === "source" && next !== "source") {
    const parsed = parseMarkdownFile(sourceMarkdown.value);

    const nextProperties =
      Object.keys(parsed.properties).length > 0 ? parsed.properties : props.properties;

    emit("update:properties", nextProperties);

    if (shouldApplySourceMarkdownOnModeSwitch(sourceRemoteStale.value)) {
      applyMarkdownToYdoc(session.ydoc, parsed.body);
    }

    sourceRemoteStale.value = false;
  } else if (previous !== "source" && next === "source") {
    const body = editor.value ? serializeMarkdown(editor.value.state.doc) : "";

    sourceMarkdown.value = composeMarkdownFile(props.properties, body);

    sourceRemoteStale.value = false;
  }

  viewMode.value = next;
}

function toggleBold() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => wrapSelection(textarea, "**"));
    return;
  }

  editor.value?.chain().focus().toggleBold().run();
}

function toggleItalic() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => wrapSelection(textarea, "*"));
    return;
  }

  editor.value?.chain().focus().toggleItalic().run();
}

function toggleStrike() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => wrapSelection(textarea, "~~"));
    return;
  }

  editor.value?.chain().focus().toggleStrike().run();
}

function setHeading(level: 1 | 2 | 3) {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => toggleHeading(textarea, level));
    return;
  }

  editor.value?.chain().focus().toggleHeading({ level }).run();
}

function toggleBullet() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => toggleBulletList(textarea));
    return;
  }

  editor.value?.chain().focus().toggleBulletList().run();
}

function toggleOrdered() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => toggleOrderedList(textarea));
    return;
  }

  editor.value?.chain().focus().toggleOrderedList().run();
}

function toggleTask() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => toggleTaskList(textarea));
    return;
  }

  editor.value?.chain().focus().toggleTaskList().run();
}

function toggleQuote() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => toggleBlockquote(textarea));
    return;
  }

  editor.value?.chain().focus().toggleBlockquote().run();
}

function toggleCode() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => toggleCodeBlock(textarea));
    return;
  }

  editor.value?.chain().focus().toggleCodeBlock().run();
}

function promptLink() {
  const href = window.prompt("Link-URL");

  if (!href) {
    return;
  }

  if (isSourceMode.value) {
    applySourceEdit((textarea) => insertLink(textarea, href));
    return;
  }

  editor.value?.chain().focus().toggleLink({ href }).run();
}

async function uploadImageFile(file: File) {
  const form = new FormData();

  form.append("file", file);
  const result = await apiFetch<{ path: string }>(
    `/api/collectives/${props.collectiveId}/pages/${props.pageId}/attachments`,
    { method: "POST", body: form },
  );

  return result.path;
}

async function insertImageAction() {
  const input = window.document.createElement("input");

  input.type = "file";
  input.accept = "image/*";

  input.onchange = () => {
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    void uploadImageFile(file)
      .then((path) => {
        if (isSourceMode.value) {
          applySourceEdit((textarea) => insertImage(textarea, path));
          return;
        }

        editor.value?.chain().focus().setImage({ src: path }).run();
      })
      .catch(() => {
        const src = window.prompt("Upload fehlgeschlagen. Bild-URL eingeben");

        if (!src) {
          return;
        }

        if (isSourceMode.value) {
          applySourceEdit((textarea) => insertImage(textarea, src));
          return;
        }

        editor.value?.chain().focus().setImage({ src }).run();
      });
  };

  input.click();
}

function insertTableAction() {
  if (isSourceMode.value) {
    applySourceEdit((textarea) => insertTable(textarea));
    return;
  }

  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
}

function serializeContent() {
  if (viewMode.value === "source") {
    return sourceMarkdown.value;
  }

  const body = editor.value ? serializeMarkdown(editor.value.state.doc) : "";

  return composeMarkdownFile(props.properties, body);
}

function applyOutsideChange(fullMarkdown: string) {
  const parsed = parseMarkdownFile(fullMarkdown);

  const nextProperties =
    Object.keys(parsed.properties).length > 0 ? parsed.properties : props.properties;

  emit("update:properties", nextProperties);
  applyMarkdownToYdoc(session.ydoc, parsed.body);

  if (viewMode.value === "source") {
    sourceMarkdown.value = composeMarkdownFile(nextProperties, parsed.body);
    void nextTick(() => syncEditorFromMarkdown());
  }
}

onMounted(() => {
  session.connect({
    serialize: serializeContent,
    seedInitialContent,
    applyOutsideChange,
  });
  session.ydoc.on("update", (_update, origin) => {
    if (viewMode.value === "source" && origin !== APPLY_MARKDOWN_ORIGIN) {
      sourceRemoteStale.value = true;
    }
  });
  window.addEventListener("beforeunload", saveBeforeUnload);
});

watch(sourceMarkdown, () => {
  if (viewMode.value === "source") {
    syncEditorFromMarkdown();
  }
});

watch(isSourceMode, (enabled) => {
  if (!enabled) {
    return;
  }

  void nextTick(() => {
    syncEditorFromMarkdown();
    const proxy = ensureSourceProxy();

    proxy.value = sourceMarkdown.value;
    proxy.setSelectionRange(sourceMarkdown.value.length, sourceMarkdown.value.length);
  });
});

function saveBeforeUnload() {
  void session.save(true);
}

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", saveBeforeUnload);
  editor.value?.destroy();
  void session.close();
});

defineExpose({
  session,
  scheduleSave: () => session.scheduleSave(),
});
</script>

<template>
  <div class="nc-text-editor flex h-full flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div
        v-if="editor && showFormattingToolbar && !toolbarDisabled"
        class="flex flex-wrap items-center gap-1 rounded-lg border bg-background p-1"
      >
        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('bold') }"
          :disabled="toolbarDisabled"
          @click="toggleBold"
        >
          <BoldIcon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('italic') }"
          :disabled="toolbarDisabled"
          @click="toggleItalic"
        >
          <ItalicIcon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('strike') }"
          :disabled="toolbarDisabled"
          @click="toggleStrike"
        >
          <StrikethroughIcon class="size-4" />
        </Button>

        <Separator orientation="vertical" class="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('heading', { level: 1 }) }"
          :disabled="toolbarDisabled"
          @click="setHeading(1)"
        >
          <Heading1Icon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('heading', { level: 2 }) }"
          :disabled="toolbarDisabled"
          @click="setHeading(2)"
        >
          <Heading2Icon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('heading', { level: 3 }) }"
          :disabled="toolbarDisabled"
          @click="setHeading(3)"
        >
          <Heading3Icon class="size-4" />
        </Button>

        <Separator orientation="vertical" class="mx-1 h-6" />

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('bulletList') }"
          :disabled="toolbarDisabled"
          @click="toggleBullet"
        >
          <ListIcon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('orderedList') }"
          :disabled="toolbarDisabled"
          @click="toggleOrdered"
        >
          <ListOrderedIcon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('taskList') }"
          :disabled="toolbarDisabled"
          @click="toggleTask"
        >
          <ListChecksIcon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('blockquote') }"
          :disabled="toolbarDisabled"
          @click="toggleQuote"
        >
          <QuoteIcon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :class="{ 'bg-accent': !isSourceMode && editor.isActive('codeBlock') }"
          :disabled="toolbarDisabled"
          @click="toggleCode"
        >
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

        <Button
          variant="ghost"
          size="icon"
          :disabled="toolbarDisabled || isSourceMode"
          @click="editor.chain().focus().undo().run()"
        >
          <UndoIcon class="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          :disabled="toolbarDisabled || isSourceMode"
          @click="editor.chain().focus().redo().run()"
        >
          <RedoIcon class="size-4" />
        </Button>
      </div>

      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <span v-if="lastCollaborator" class="truncate">
          {{ lastCollaborator }}
        </span>
        <Tooltip>
          <TooltipTrigger as-child>
            <span
              class="inline-flex size-7 items-center justify-center rounded-md"
              :aria-label="editorStatus.label"
            >
              <component
                :is="editorStatus.icon"
                class="size-4"
                :class="[statusIconClass, editorStatus.spin && 'animate-spin']"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ editorStatus.label }}</TooltipContent>
        </Tooltip>
      </div>

      <div class="ml-auto flex items-center gap-3">
        <EditorViewModeToggle :model-value="viewMode" @update:model-value="switchViewMode" />
      </div>
    </div>

    <div
      v-if="sourceRemoteStale"
      class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      Die Seite wurde von einem anderen Nutzer geändert — bitte den Modus wechseln, um den Inhalt zu
      aktualisieren.
    </div>

    <div
      v-if="session.conflictContent.value"
      class="flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <span>Die Seite wurde außerhalb dieser Sitzung geändert.</span>
      <Button size="sm" @click="emit('reload')"> Neu laden </Button>
    </div>

    <div
      v-if="session.expired.value"
      class="flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      <span>Die Bearbeitungssitzung ist abgelaufen.</span>
      <Button size="sm" @click="emit('reload')"> Neu laden </Button>
    </div>

    <div v-if="viewMode === 'source'" class="h-full flex justify-center">
      <div
        ref="sourceEditorRef"
        class="min-h-[60vh] w-full rounded-md bg-transparent font-mono text-sm leading-relaxed whitespace-pre-wrap wrap-break-word focus:outline-none prose max-w-full"
        role="textbox"
        aria-multiline="true"
        :contenteditable="toolbarDisabled ? 'false' : 'plaintext-only'"
        spellcheck="false"
        @input="onSourceInput"
      />
    </div>

    <div v-else class="bg-background">
      <EditorContent :editor="editor" class="flex justify-center" />
    </div>
  </div>
</template>
