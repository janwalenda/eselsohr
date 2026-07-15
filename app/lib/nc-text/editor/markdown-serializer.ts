/**
 * Serialize the editor's ProseMirror document back to markdown for saving to
 * Nextcloud. Built on prosemirror-markdown's serializer (as nextcloud/text does in
 * `src/extensions/Markdown.js`), with explicit node/mark handlers for the Tiptap
 * schema this editor uses (incl. task lists, tables and Collectives callouts).
 */

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  MarkdownSerializer,
  type MarkdownSerializerState,
  defaultMarkdownSerializer,
} from "prosemirror-markdown";

function serializeCodeBlock(state: MarkdownSerializerState, node: ProseMirrorNode) {
  const language = (node.attrs.language as string) || "";

  state.write(`\`\`\`${language}\n`);
  state.text(node.textContent, false);
  state.ensureNewLine();
  state.write("```");
  state.closeBlock(node);
}

function serializeCallout(state: MarkdownSerializerState, node: ProseMirrorNode) {
  state.write(`::: ${(node.attrs.type as string) || "info"}`);
  state.ensureNewLine();
  state.renderContent(node);
  state.write(":::");
  state.closeBlock(node);
}

function serializeTable(state: MarkdownSerializerState, node: ProseMirrorNode) {
  const rows: string[][] = [];

  node.forEach((row) => {
    const cells: string[] = [];

    row.forEach((cell) => {
      cells.push(cell.textContent.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim());
    });
    rows.push(cells);
  });

  if (rows.length === 0) {
    return;
  }

  const columns = Math.max(...rows.map((row) => row.length));

  const pad = (row: string[]) => {
    const filled = [...row];

    while (filled.length < columns) {
      filled.push("");
    }

    return filled;
  };

  const [headerRow, ...bodyRows] = rows;

  state.write(`| ${pad(headerRow).join(" | ")} |`);
  state.ensureNewLine();
  state.write(
    `| ${pad(headerRow)
      .map(() => "---")
      .join(" | ")} |`,
  );
  state.ensureNewLine();

  for (const row of bodyRows) {
    state.write(`| ${pad(row).join(" | ")} |`);
    state.ensureNewLine();
  }

  state.closeBlock(node);
}

const nodes: Record<
  string,
  (
    state: MarkdownSerializerState,
    node: ProseMirrorNode,
    parent: ProseMirrorNode,
    index: number,
  ) => void
> = {
  doc: (state, node) => state.renderContent(node),
  paragraph: defaultMarkdownSerializer.nodes.paragraph,
  text: defaultMarkdownSerializer.nodes.text,
  heading: defaultMarkdownSerializer.nodes.heading,
  blockquote: defaultMarkdownSerializer.nodes.blockquote,
  horizontalRule: defaultMarkdownSerializer.nodes.horizontal_rule,
  hardBreak: defaultMarkdownSerializer.nodes.hard_break,
  image: defaultMarkdownSerializer.nodes.image,
  bulletList: defaultMarkdownSerializer.nodes.bullet_list,
  orderedList: defaultMarkdownSerializer.nodes.ordered_list,
  listItem: defaultMarkdownSerializer.nodes.list_item,
  codeBlock: serializeCodeBlock,
  callout: serializeCallout,
  table: serializeTable,
  taskList: (state, node) => state.renderList(node, "  ", () => "- "),
  taskItem: (state, node) => {
    state.write(`[${node.attrs.checked ? "x" : " "}] `);
    state.renderContent(node);
  },
};

const marks: MarkdownSerializer["marks"] = {
  bold: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
  italic: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
  strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
  code: defaultMarkdownSerializer.marks.code,
  link: defaultMarkdownSerializer.marks.link,
};

const serializer = new MarkdownSerializer(nodes, marks);

export function serializeMarkdown(doc: ProseMirrorNode): string {
  return serializer.serialize(doc, { tightLists: true });
}
