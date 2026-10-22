import type { Component } from "vue";
import type { Editor } from "@tiptap/vue-3";
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
  WorkflowIcon,
} from "lucide-vue-next";

export type TextEditorCommands = {
  toggleBold: () => void;
  addWikiLink: () => void;
  toggleItalic: () => void;
  toggleStrike: () => void;
  setHeading: (level: 1 | 2 | 3) => void;
  toggleBullet: () => void;
  toggleOrdered: () => void;
  toggleTask: () => void;
  toggleQuote: () => void;
  toggleCode: () => void;
  promptLink: () => void;
  insertImageAction: () => void;
  insertTableAction: () => void;
  insertDiagramAction: () => void;
  undo: () => void;
  redo: () => void;
};

export type ToolbarAction = {
  key: string;
  icon?: Component;
  label?: string;
  /** Accessible name for icon-only buttons (also used as title tooltip). */
  ariaLabel: string;
  action: () => void;
  isActive?: () => boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
};

export function buildToolbarActions(options: {
  editor: Editor;
  isSourceMode: boolean;
  toolbarDisabled: boolean;
  commands: TextEditorCommands;
}): ToolbarAction[] {
  const { commands, editor, isSourceMode, toolbarDisabled } = options;

  const active = (name: string, attrs?: Record<string, unknown>) =>
    !isSourceMode && editor.isActive(name, attrs);

  return [
    {
      key: "bold",
      icon: BoldIcon,
      ariaLabel: "Fett",
      action: commands.toggleBold,
      isActive: () => active("bold"),
    },
    { key: "wiki", label: "[]", ariaLabel: "Wiki-Link", action: commands.addWikiLink },
    {
      key: "italic",
      icon: ItalicIcon,
      ariaLabel: "Kursiv",
      action: commands.toggleItalic,
      isActive: () => active("italic"),
    },
    {
      key: "strike",
      icon: StrikethroughIcon,
      ariaLabel: "Durchgestrichen",
      action: commands.toggleStrike,
      isActive: () => active("strike"),
    },
    {
      key: "h1",
      icon: Heading1Icon,
      ariaLabel: "Überschrift 1",
      action: () => commands.setHeading(1),
      isActive: () => active("heading", { level: 1 }),
      separatorBefore: true,
    },
    {
      key: "h2",
      icon: Heading2Icon,
      ariaLabel: "Überschrift 2",
      action: () => commands.setHeading(2),
      isActive: () => active("heading", { level: 2 }),
    },
    {
      key: "h3",
      icon: Heading3Icon,
      ariaLabel: "Überschrift 3",
      action: () => commands.setHeading(3),
      isActive: () => active("heading", { level: 3 }),
    },
    {
      key: "bullet",
      icon: ListIcon,
      ariaLabel: "Aufzählung",
      action: commands.toggleBullet,
      isActive: () => active("bulletList"),
      separatorBefore: true,
    },
    {
      key: "ordered",
      icon: ListOrderedIcon,
      ariaLabel: "Nummerierte Liste",
      action: commands.toggleOrdered,
      isActive: () => active("orderedList"),
    },
    {
      key: "task",
      icon: ListChecksIcon,
      ariaLabel: "Checkliste",
      action: commands.toggleTask,
      isActive: () => active("taskList"),
    },
    {
      key: "quote",
      icon: QuoteIcon,
      ariaLabel: "Zitat",
      action: commands.toggleQuote,
      isActive: () => active("blockquote"),
    },
    {
      key: "code",
      icon: Code2Icon,
      ariaLabel: "Codeblock",
      action: commands.toggleCode,
      isActive: () => active("codeBlock"),
    },
    {
      key: "link",
      icon: LinkIcon,
      ariaLabel: "Link",
      action: commands.promptLink,
      separatorBefore: true,
    },
    { key: "image", icon: ImageIcon, ariaLabel: "Bild", action: commands.insertImageAction },
    { key: "table", icon: TableIcon, ariaLabel: "Tabelle", action: commands.insertTableAction },
    {
      key: "diagram",
      icon: WorkflowIcon,
      ariaLabel: "Diagramm einfügen",
      action: commands.insertDiagramAction,
    },
    {
      key: "undo",
      icon: UndoIcon,
      ariaLabel: "Rückgängig",
      action: commands.undo,
      disabled: toolbarDisabled || isSourceMode,
      separatorBefore: true,
    },
    {
      key: "redo",
      icon: RedoIcon,
      ariaLabel: "Wiederholen",
      action: commands.redo,
      disabled: toolbarDisabled || isSourceMode,
    },
  ];
}
