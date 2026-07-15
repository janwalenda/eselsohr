import { nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { useEditor } from "@tiptap/vue-3";
import type { ViewMode } from "@/components/workspace/EditorViewModeToggle.vue";
import { buildExtensions } from "@/lib/nc-text/editor/extensions";
import { APPLY_MARKDOWN_ORIGIN, applyMarkdownToYdoc } from "@/lib/nc-text/editor/apply-markdown";
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
import { colorForName, useTextEditorStatus } from "@/composables/useTextEditorStatus";
import { useTextEditorSourceMode } from "@/composables/useTextEditorSourceMode";
import { useTextEditorCommands } from "@/composables/useTextEditorCommands";

export function useCollaborativeEditor(options: {
  collectiveId: MaybeRefOrGetter<number>;
  pageId: MaybeRefOrGetter<number>;
  userName: MaybeRefOrGetter<string>;
  properties: MaybeRefOrGetter<PageProperties>;
  pages: MaybeRefOrGetter<Pick<CollectivePage, "id" | "title">[] | undefined>;
  emit: {
    (e: "reload"): void;
    (e: "update:properties", properties: PageProperties): void;
    (e: "wikiLinkClick", payload: { target: string; resolvedPageId: number | null }): void;
  };
}) {
  const { collectiveId, pageId, userName, properties, pages, emit } = options;

  const session = useTextSession(toValue(collectiveId), toValue(pageId), {
    name: toValue(userName),
    color: colorForName(toValue(userName)),
  });

  const apiFetch = useApiFetch();

  const viewMode = ref<ViewMode>("editing");

  const sourceMarkdown = ref("");

  const sourceRemoteStale = ref(false);

  const wikiLinkSuggestionRender = createWikiLinkSuggestionRender(WikiLinkSuggestionList);

  const markDirty = () => session.scheduleSave();

  const sourceMode = useTextEditorSourceMode(sourceMarkdown, markDirty);

  const { lastCollaborator, editorStatus, statusIconClass } = useTextEditorStatus(session);

  function buildEditorExtensions() {
    return buildExtensions({
      document: session.ydoc,
      awareness: session.awareness,
      collectiveId: toValue(collectiveId),
      pageId: toValue(pageId),
      pages: toValue(pages) ?? [],
      enableWikiLinkSuggestion: true,
      wikiLinkSuggestion: { render: wikiLinkSuggestionRender },
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
      : (resolveWikiLinkTarget(target, toValue(pages) ?? [])?.id ?? null);

    const isBroken = resolvedPageId === null || !Number.isFinite(resolvedPageId);

    if (isBroken || openForReading || openWithModifier) {
      emit("wikiLinkClick", {
        target,
        resolvedPageId: isBroken ? null : resolvedPageId,
      });
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

  const toolbarDisabled = computed(() => session.readOnly.value);

  const isSourceMode = computed(() => viewMode.value === "source");

  const showFormattingToolbar = computed(() => viewMode.value !== "reading");

  watch(isContentEditable, (editable) => editor.value?.setEditable(editable), { immediate: true });

  watch(
    () => toValue(pages),
    (nextPages) => {
      const wikiLinkExtension = editor.value?.extensionManager.extensions.find(
        (extension) => extension.name === "wikiLink",
      );

      if (wikiLinkExtension) {
        wikiLinkExtension.options.pages = nextPages;
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

  watch(
    () => toValue(properties),
    () => {
      if (viewMode.value !== "source") {
        return;
      }

      const parsed = parseMarkdownFile(sourceMarkdown.value);

      sourceMarkdown.value = composeMarkdownFile(toValue(properties), parsed.body);
      void nextTick(() => sourceMode.syncEditorFromMarkdown());
    },
    { deep: true },
  );

  const commands = useTextEditorCommands({
    editor,
    isSourceMode,
    applySourceEdit: sourceMode.applySourceEdit,
    apiFetch,
    collectiveId,
    pageId,
  });

  function switchViewMode(next: ViewMode) {
    if (next === viewMode.value) {
      return;
    }

    const previous = viewMode.value;

    if (previous === "source" && next !== "source") {
      const parsed = parseMarkdownFile(sourceMarkdown.value);

      const nextProperties =
        Object.keys(parsed.properties).length > 0 ? parsed.properties : toValue(properties);

      emit("update:properties", nextProperties);

      if (shouldApplySourceMarkdownOnModeSwitch(sourceRemoteStale.value)) {
        applyMarkdownToYdoc(session.ydoc, parsed.body);
      }

      sourceRemoteStale.value = false;
    } else if (previous !== "source" && next === "source") {
      const body = editor.value ? serializeMarkdown(editor.value.state.doc) : "";

      sourceMarkdown.value = composeMarkdownFile(toValue(properties), body);
      sourceRemoteStale.value = false;
    }

    viewMode.value = next;
  }

  function serializeContent() {
    if (viewMode.value === "source") {
      return sourceMarkdown.value;
    }

    const body = editor.value ? serializeMarkdown(editor.value.state.doc) : "";

    return composeMarkdownFile(toValue(properties), body);
  }

  function applyOutsideChange(fullMarkdown: string) {
    const parsed = parseMarkdownFile(fullMarkdown);

    const nextProperties =
      Object.keys(parsed.properties).length > 0 ? parsed.properties : toValue(properties);

    emit("update:properties", nextProperties);
    applyMarkdownToYdoc(session.ydoc, parsed.body);

    if (viewMode.value === "source") {
      sourceMarkdown.value = composeMarkdownFile(nextProperties, parsed.body);
      void nextTick(() => sourceMode.syncEditorFromMarkdown());
    }
  }

  function saveBeforeUnload() {
    void session.save(true);
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
      sourceMode.syncEditorFromMarkdown();
    }
  });

  watch(isSourceMode, (enabled) => {
    if (!enabled) {
      return;
    }

    void nextTick(() => {
      sourceMode.syncEditorFromMarkdown();
      const proxy = sourceMode.ensureSourceProxy();

      proxy.value = sourceMarkdown.value;
      proxy.setSelectionRange(sourceMarkdown.value.length, sourceMarkdown.value.length);
    });
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", saveBeforeUnload);
    editor.value?.destroy();
    void session.close();
  });

  return {
    session,
    editor,
    viewMode,
    sourceRemoteStale,
    sourceEditorRef: sourceMode.sourceEditorRef,
    onSourceInput: sourceMode.onSourceInput,
    lastCollaborator,
    editorStatus,
    statusIconClass,
    toolbarDisabled,
    isSourceMode,
    showFormattingToolbar,
    switchViewMode,
    commands,
    scheduleSave: () => session.scheduleSave(),
  };
}
