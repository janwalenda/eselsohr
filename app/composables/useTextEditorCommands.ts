import type { Editor } from "@tiptap/vue-3";
import { TextSelection } from "@tiptap/pm/state";
import {
  insertAtCursor,
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

type ApiFetch = ReturnType<typeof useApiFetch>;

export function useTextEditorCommands(options: {
  editor: Ref<Editor | undefined>;
  isSourceMode: ComputedRef<boolean>;
  applySourceEdit: (mutator: (textarea: HTMLTextAreaElement) => void) => void;
  apiFetch: ApiFetch;
  collectiveId: MaybeRefOrGetter<number>;
  pageId: MaybeRefOrGetter<number>;
  openDiagramBuilder?: (mode: "insert" | "edit", source?: string, pos?: number | null) => void;
}) {
  const {
    editor,
    isSourceMode,
    applySourceEdit,
    apiFetch,
    collectiveId,
    pageId,
    openDiagramBuilder,
  } = options;

  function toggleBold() {
    if (isSourceMode.value) {
      applySourceEdit((textarea) => wrapSelection(textarea, "**"));
      return;
    }

    editor.value?.chain().focus().toggleBold().run();
  }

  function addWikiLink() {
    if (isSourceMode.value) {
      applySourceEdit((textarea) => wrapSelection(textarea, "[[", "]]"));
      return;
    }

    const ed = editor.value;

    if (!ed) {
      return;
    }

    const { from, to, empty } = ed.state.selection;

    if (!empty) {
      const selected = ed.state.doc.textBetween(from, to, "").trim();

      if (selected) {
        ed.chain()
          .focus()
          .insertContentAt(
            { from, to },
            { type: "wikiLink", attrs: { target: selected, label: null } },
          )
          .run();
        return;
      }
    }

    ed.chain()
      .focus()
      .command(({ tr, dispatch }) => {
        tr.insertText("[[", from);
        tr.setSelection(TextSelection.create(tr.doc, from + 2));
        dispatch?.(tr);
        return true;
      })
      .run();
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
      `/api/collectives/${toValue(collectiveId)}/pages/${toValue(pageId)}/attachments`,
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

          editor.value
            ?.chain()
            .focus()
            .command(({ state, tr }) => {
              const { $from } = state.selection;

              if (
                $from.parent.type.name !== "codeBlock" ||
                String($from.parent.attrs.language ?? "")
                  .trim()
                  .toLowerCase() !== "mermaid"
              ) {
                return true;
              }

              const pos = $from.before($from.depth);

              const node = tr.doc.nodeAt(pos);

              if (!node) {
                return true;
              }

              const after = pos + node.nodeSize;

              const paragraph = state.schema.nodes.paragraph?.create();

              if (paragraph) {
                tr.insert(after, paragraph);
                tr.setSelection(TextSelection.create(tr.doc, after + 1));
              } else {
                tr.setSelection(TextSelection.near(tr.doc.resolve(after)));
              }

              return true;
            })
            .setImage({ src: path })
            .run();
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

          editor.value
            ?.chain()
            .focus()
            .command(({ state, tr }) => {
              const { $from } = state.selection;

              if (
                $from.parent.type.name !== "codeBlock" ||
                String($from.parent.attrs.language ?? "")
                  .trim()
                  .toLowerCase() !== "mermaid"
              ) {
                return true;
              }

              const pos = $from.before($from.depth);

              const node = tr.doc.nodeAt(pos);

              if (!node) {
                return true;
              }

              const after = pos + node.nodeSize;

              const paragraph = state.schema.nodes.paragraph?.create();

              if (paragraph) {
                tr.insert(after, paragraph);
                tr.setSelection(TextSelection.create(tr.doc, after + 1));
              } else {
                tr.setSelection(TextSelection.near(tr.doc.resolve(after)));
              }

              return true;
            })
            .setImage({ src })
            .run();
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

  function insertDiagramAction() {
    openDiagramBuilder?.("insert");
  }

  function insertMermaidSource(source: string) {
    const fenced = `\n\`\`\`mermaid\n${source.trim()}\n\`\`\`\n`;

    if (isSourceMode.value) {
      applySourceEdit((textarea) => insertAtCursor(textarea, fenced));
      return;
    }

    editor.value
      ?.chain()
      .focus()
      .insertContent({
        type: "codeBlock",
        attrs: { language: "mermaid" },
        content: [{ type: "text", text: source.trim() }],
      })
      .run();
  }

  function undo() {
    editor.value?.chain().focus().undo().run();
  }

  function redo() {
    editor.value?.chain().focus().redo().run();
  }

  return {
    toggleBold,
    addWikiLink,
    toggleItalic,
    toggleStrike,
    setHeading,
    toggleBullet,
    toggleOrdered,
    toggleTask,
    toggleQuote,
    toggleCode,
    promptLink,
    insertImageAction,
    insertTableAction,
    insertDiagramAction,
    insertMermaidSource,
    undo,
    redo,
  };
}
