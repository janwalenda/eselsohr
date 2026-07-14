import { VueRenderer } from "@tiptap/vue-3";
import type { Component } from "vue";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { WikiLinkSuggestionItem } from "./WikiLink";

function positionPopup(
  element: HTMLElement,
  clientRect: (() => DOMRect | null) | null | undefined,
) {
  if (!clientRect) {
    return;
  }

  const rect = clientRect();

  if (!rect) {
    return;
  }

  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.bottom + 4}px`;
  element.style.zIndex = "50";
}

function toSuggestionListProps(
  props: SuggestionProps<WikiLinkSuggestionItem, WikiLinkSuggestionItem>,
) {
  return {
    items: props.items,
    command: props.command,
  };
}

export function createWikiLinkSuggestionRender(component: Component) {
  return () => {
    let vueRenderer: VueRenderer | null = null;

    let popupElement: HTMLDivElement | null = null;

    return {
      onStart(props: SuggestionProps<WikiLinkSuggestionItem, WikiLinkSuggestionItem>) {
        popupElement = document.createElement("div");
        popupElement.className = "wiki-link-suggestion-popup";
        document.body.appendChild(popupElement);

        vueRenderer = new VueRenderer(component, {
          props: toSuggestionListProps(props),
          editor: props.editor,
        });

        popupElement.appendChild(vueRenderer.element as Node);
        positionPopup(popupElement, props.clientRect);
      },
      onUpdate(props: SuggestionProps<WikiLinkSuggestionItem, WikiLinkSuggestionItem>) {
        vueRenderer?.updateProps(toSuggestionListProps(props));
        positionPopup(popupElement!, props.clientRect);
      },
      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === "Escape") {
          return true;
        }

        const ref = vueRenderer?.ref as { onKeyDown?: (event: KeyboardEvent) => boolean } | null;

        return ref?.onKeyDown?.(props.event) ?? false;
      },
      onExit() {
        vueRenderer?.destroy();
        popupElement?.remove();
        vueRenderer = null;
        popupElement = null;
      },
    };
  };
}
