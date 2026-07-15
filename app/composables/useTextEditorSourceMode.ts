export function useTextEditorSourceMode(sourceMarkdown: Ref<string>, markDirty: () => void) {
  const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null);

  const sourceEditorRef = ref<HTMLDivElement | null>(null);

  function ensureSourceProxy() {
    let proxy = sourceTextareaRef.value;

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

    return { start, end: preEndRange.toString().length };
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
    const editorEl = sourceEditorRef.value;

    const proxy = ensureSourceProxy();

    if (!editorEl) {
      proxy.value = sourceMarkdown.value;
      proxy.setSelectionRange(sourceMarkdown.value.length, sourceMarkdown.value.length);
      return proxy;
    }

    const { start, end } = readEditorSelectionOffsets(editorEl);

    proxy.value = editorEl.textContent ?? "";
    proxy.setSelectionRange(start, end);
    return proxy;
  }

  function syncEditorFromMarkdown(selection?: { start: number; end: number }) {
    const editorEl = sourceEditorRef.value;

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
    syncEditorFromMarkdown({ start: proxy.selectionStart, end: proxy.selectionEnd });
    markDirty();
  }

  function onSourceInput() {
    sourceMarkdown.value = sourceEditorRef.value?.textContent ?? "";
    markDirty();
  }

  return {
    sourceTextareaRef,
    sourceEditorRef,
    ensureSourceProxy,
    syncEditorFromMarkdown,
    applySourceEdit,
    onSourceInput,
  };
}
