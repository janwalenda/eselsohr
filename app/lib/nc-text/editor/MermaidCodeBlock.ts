/**
 * CodeBlock extension that renders Mermaid fenced blocks as live diagrams while
 * keeping the ProseMirror node type as `codeBlock` for Nextcloud Text / Yjs
 * schema compatibility. Non-mermaid code blocks keep a normal editable view.
 */

import CodeBlock from "@tiptap/extension-code-block";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
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

  wrapper.append(preview);

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
  };
}

export const MermaidCodeBlock = CodeBlock.extend<MermaidCodeBlockOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      onEditDiagram: undefined,
    };
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
