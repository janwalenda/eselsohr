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
  undo: () => void;
  redo: () => void;
};

export type ToolbarAction = {
  key: string;
  icon?: Component;
  label?: string;
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
    { key: "bold", icon: BoldIcon, action: commands.toggleBold, isActive: () => active("bold") },
    { key: "wiki", label: "[]", action: commands.addWikiLink },
    {
      key: "italic",
      icon: ItalicIcon,
      action: commands.toggleItalic,
      isActive: () => active("italic"),
    },
    {
      key: "strike",
      icon: StrikethroughIcon,
      action: commands.toggleStrike,
      isActive: () => active("strike"),
    },
    {
      key: "h1",
      icon: Heading1Icon,
      action: () => commands.setHeading(1),
      isActive: () => active("heading", { level: 1 }),
      separatorBefore: true,
    },
    {
      key: "h2",
      icon: Heading2Icon,
      action: () => commands.setHeading(2),
      isActive: () => active("heading", { level: 2 }),
    },
    {
      key: "h3",
      icon: Heading3Icon,
      action: () => commands.setHeading(3),
      isActive: () => active("heading", { level: 3 }),
    },
    {
      key: "bullet",
      icon: ListIcon,
      action: commands.toggleBullet,
      isActive: () => active("bulletList"),
      separatorBefore: true,
    },
    {
      key: "ordered",
      icon: ListOrderedIcon,
      action: commands.toggleOrdered,
      isActive: () => active("orderedList"),
    },
    {
      key: "task",
      icon: ListChecksIcon,
      action: commands.toggleTask,
      isActive: () => active("taskList"),
    },
    {
      key: "quote",
      icon: QuoteIcon,
      action: commands.toggleQuote,
      isActive: () => active("blockquote"),
    },
    {
      key: "code",
      icon: Code2Icon,
      action: commands.toggleCode,
      isActive: () => active("codeBlock"),
    },
    { key: "link", icon: LinkIcon, action: commands.promptLink, separatorBefore: true },
    { key: "image", icon: ImageIcon, action: commands.insertImageAction },
    { key: "table", icon: TableIcon, action: commands.insertTableAction },
    {
      key: "undo",
      icon: UndoIcon,
      action: commands.undo,
      disabled: toolbarDisabled || isSourceMode,
      separatorBefore: true,
    },
    {
      key: "redo",
      icon: RedoIcon,
      action: commands.redo,
      disabled: toolbarDisabled || isSourceMode,
    },
  ];
}
