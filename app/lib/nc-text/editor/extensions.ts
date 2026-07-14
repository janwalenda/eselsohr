/**
 * Tiptap extension set for the collaborative editor. Mirrors the core of
 * nextcloud/text's RichText extension (the common Collectives content); custom
 * Text-only nodes (mathematics, mentions, details, front matter, …) are not yet
 * ported and are tracked as follow-up parity work.
 */

import type { Extension, Node as TiptapNode, Mark } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import type { Doc } from "yjs";
import type { Awareness } from "y-protocols/awareness";
import type { CollectivePage } from "~~/shared/collectives";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { Callout } from "./Callout";
import { ResolvedImage } from "./ResolvedImage";
import { WikiLink, type WikiLinkSuggestionItem } from "./WikiLink";

type AnyExtension = Extension | TiptapNode | Mark;

export interface BuildExtensionsOptions {
  /** Whether the editor is editable (adds the placeholder). */
  editing?: boolean;
  /** Yjs document to bind via the Collaboration extension. */
  document?: Doc;
  /** Awareness instance for remote carets. */
  awareness?: Awareness;
  /** Collective/page ids used to resolve attachment image paths for display. */
  collectiveId?: number;
  pageId?: number;
  /** Pages available for wiki-link resolution and autocomplete. */
  pages?: Pick<CollectivePage, "id" | "title">[];
  /** Enables the `[[` autocomplete popup in the editor. */
  enableWikiLinkSuggestion?: boolean;
  wikiLinkSuggestion?: Partial<
    Omit<SuggestionOptions<WikiLinkSuggestionItem, WikiLinkSuggestionItem>, "editor">
  >;
}

export function buildExtensions(options: BuildExtensionsOptions = {}): AnyExtension[] {
  const {
    editing = true,
    document,
    awareness,
    collectiveId = 0,
    pageId = 0,
    pages = [],
    enableWikiLinkSuggestion = false,
    wikiLinkSuggestion,
  } = options;

  const extensions: AnyExtension[] = [
    // Undo/redo is handled by the Collaboration extension, so disable the
    // built-in history. Underline has no markdown representation, so omit it to
    // keep round-tripping clean.
    // Prevent accidental navigation while editing; clicks are handled in
    // TextCollaborativeEditor (reading mode + Cmd/Ctrl+click in edit mode).
    StarterKit.configure({
      undoRedo: false,
      underline: false,
      link: { openOnClick: false },
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    ResolvedImage.configure({ collectiveId, pageId }),
    Callout,
    WikiLink.configure({
      collectiveId,
      pages,
      enableSuggestion: editing && enableWikiLinkSuggestion,
      suggestion: wikiLinkSuggestion ?? {},
    }),
  ];

  if (document) {
    extensions.push(Collaboration.configure({ document }));
  }

  if (awareness) {
    extensions.push(CollaborationCaret.configure({ provider: { awareness } }));
  }

  if (editing) {
    extensions.push(
      Placeholder.configure({ placeholder: "Schreib los oder füge mit „/“ Inhalte hinzu …" }),
    );
  }

  return extensions;
}
