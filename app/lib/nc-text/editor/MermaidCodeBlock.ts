/**
 * CodeBlock extension that renders Mermaid fenced blocks as live diagrams while
 * keeping the ProseMirror node type as `codeBlock` for Nextcloud Text / Yjs
 * schema compatibility. Non-mermaid code blocks keep a normal editable view.
 *
 * Mermaid source is edited via the dialog only. The node view keeps a hidden
 * contentDOM so ProseMirror/Yjs can preserve the codeBlock across adjacent
 * edits (e.g. inserting an image). Without contentDOM, nearby replaces can
 * flatten the fence into escaped paragraph text. A plugin intercepts
 * Enter/arrows only when the selection is on/in a mermaid block.
 */

import CodeBlock from "@tiptap/extension-code-block";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { renderMermaid } from "@/composables/useMermaidRender";

export type EditDiagramPayload = {
  getPos: () => number | undefined;
  source: string;
};

export type MermaidCodeBlockOptions = {
  languageClassPrefix: string;
  HTMLAttributes: Record<string, unknown>;
  exitOnTripleEnter: boolean;
  exitOnArrowDown: boolean;
  defaultLanguage: string | null | undefined;
  enableTabIndentation: boolean;
  tabSize: number;
  onEditDiagram?: (payload: EditDiagramPayload) => void;
};

function isMermaidLanguage(language: unknown) {
  return (
    String(language ?? "")
      .trim()
      .toLowerCase() === "mermaid"
  );
}

function isMermaidCodeBlock(node: ProseMirrorNode | null | undefined) {
  return Boolean(node && node.type.name === "codeBlock" && isMermaidLanguage(node.attrs.language));
}

function getMermaidSelectionPos(selection: EditorView["state"]["selection"]): number | null {
  if (selection instanceof NodeSelection && isMermaidCodeBlock(selection.node)) {
    return selection.from;
  }

  const { $from } = selection;

  if (!isMermaidCodeBlock($from.parent)) {
    return null;
  }

  return $from.before($from.depth);
}

function exitMermaidBlock(view: EditorView, pos: number, insertParagraph: boolean) {
  const node = view.state.doc.nodeAt(pos);

  if (!node || !isMermaidCodeBlock(node)) {
    return false;
  }

  const after = pos + node.nodeSize;

  const tr = view.state.tr;

  if (insertParagraph) {
    const paragraph = view.state.schema.nodes.paragraph?.create();

    if (paragraph) {
      tr.insert(after, paragraph);
      tr.setSelection(TextSelection.create(tr.doc, after + 1));
    } else {
      tr.setSelection(TextSelection.near(tr.doc.resolve(after)));
    }
  } else {
    tr.setSelection(TextSelection.near(tr.doc.resolve(after)));
  }

  view.dispatch(tr.scrollIntoView());
  return true;
}

function createMermaidGuardPlugin() {
  return new Plugin({
    key: new PluginKey("mermaidCodeBlockGuard"),
    props: {
      handleClickOn(view, _pos, node, nodePos, event, direct) {
        if (!direct || !isMermaidCodeBlock(node)) {
          return false;
        }

        if (event.target instanceof Element && event.target.closest(".mermaid-block__edit")) {
          return false;
        }

        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
        return true;
      },
      handleKeyDown(view, event) {
        const pos = getMermaidSelectionPos(view.state.selection);

        if (pos === null) {
          return false;
        }

        if (event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowRight") {
          return exitMermaidBlock(view, pos, event.key === "Enter");
        }

        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          view.dispatch(
            view.state.tr
              .setSelection(TextSelection.near(view.state.doc.resolve(pos), -1))
              .scrollIntoView(),
          );
          return true;
        }

        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          return true;
        }

        return false;
      },
    },
  });
}

function createPlainCodeView(node: ProseMirrorNode) {
  const pre = document.createElement("pre");

  const code = document.createElement("code");

  const language = String(node.attrs.language ?? "");

  if (language) {
    code.classList.add(`language-${language}`);
  }

  pre.append(code);

  return {
    dom: pre,
    contentDOM: code,
    update(updatedNode: ProseMirrorNode) {
      if (updatedNode.type.name !== "codeBlock" || isMermaidLanguage(updatedNode.attrs.language)) {
        return false;
      }

      const nextLanguage = String(updatedNode.attrs.language ?? "");

      code.className = nextLanguage ? `language-${nextLanguage}` : "";
      return true;
    },
  };
}

function createMermaidView(
  node: ProseMirrorNode,
  getPos: () => number | undefined,
  onEditDiagram?: (payload: EditDiagramPayload) => void,
  editable = true,
) {
  const wrapper = document.createElement("div");

  wrapper.className = "mermaid-block";
  wrapper.setAttribute("data-mermaid", "");
  wrapper.contentEditable = "false";

  const preview = document.createElement("div");

  preview.className = "mermaid-block__preview";

  // Hidden contentDOM keeps the codeBlock mapped in the view. Adjacent edits
  // (image insert, splits) otherwise destroy the node and spill source into a
  // paragraph — which then serializes as \`\`\`mermaid / A\[Start\].
  const contentDOM = document.createElement("pre");

  contentDOM.className = "mermaid-block__content";
  contentDOM.setAttribute("aria-hidden", "true");
  contentDOM.style.cssText =
    "position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;";

  const actions = document.createElement("div");

  actions.className = "mermaid-block__actions";

  if (editable && onEditDiagram) {
    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "mermaid-block__edit";
    editButton.textContent = "Diagramm bearbeiten";
    editButton.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    editButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onEditDiagram({ getPos, source: node.textContent });
    });
    actions.append(editButton);
  }

  wrapper.append(preview, contentDOM);

  if (actions.childNodes.length > 0) {
    wrapper.append(actions);
  }

  let currentSource = node.textContent;

  let renderToken = 0;

  async function render(source: string) {
    const token = ++renderToken;

    preview.classList.remove("mermaid-block__preview--error");
    preview.innerHTML = `<div class="mermaid-block__loading">Diagramm wird gerendert…</div>`;

    const result = await renderMermaid(source);

    if (token !== renderToken) {
      return;
    }

    if (result.ok) {
      preview.innerHTML = result.svg;
      return;
    }

    preview.classList.add("mermaid-block__preview--error");
    preview.innerHTML = "";
    const pre = document.createElement("pre");

    pre.className = "mermaid-block__fallback";
    pre.textContent = source || "(leer)";
    const hint = document.createElement("p");

    hint.className = "mermaid-block__error";
    hint.textContent = result.error;
    preview.append(hint, pre);
  }

  void render(currentSource);

  return {
    dom: wrapper,
    contentDOM,
    update(updatedNode: ProseMirrorNode) {
      if (updatedNode.type.name !== "codeBlock" || !isMermaidLanguage(updatedNode.attrs.language)) {
        return false;
      }

      node = updatedNode;
      const nextSource = updatedNode.textContent;

      if (nextSource !== currentSource) {
        currentSource = nextSource;
        void render(currentSource);
      }

      return true;
    },
    ignoreMutation: () => true,
    selectNode() {
      wrapper.classList.add("mermaid-block--selected");
    },
    deselectNode() {
      wrapper.classList.remove("mermaid-block--selected");
    },
    stopEvent(event: Event) {
      const target = event.target;

      return target instanceof Element && Boolean(target.closest(".mermaid-block__edit"));
    },
  };
}

export const MermaidCodeBlock = CodeBlock.extend<MermaidCodeBlockOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      onEditDiagram: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), createMermaidGuardPlugin()];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      if (isMermaidLanguage(node.attrs.language)) {
        return createMermaidView(node, getPos, this.options.onEditDiagram, editor.isEditable);
      }

      return createPlainCodeView(node);
    };
  },
});

export default MermaidCodeBlock;
