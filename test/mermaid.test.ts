import { describe, expect, it } from "vitest";
import { parseDiagram } from "../app/lib/mermaid/parse";
import { serializeDiagram } from "../app/lib/mermaid/serialize";
import { emptyModel } from "../app/lib/mermaid/types";

describe("serializeDiagram / parseDiagram", () => {
  it("round-trips a flowchart", () => {
    const model = emptyModel("flowchart");

    if (model.kind !== "flowchart") {
      throw new Error("expected flowchart");
    }

    const text = serializeDiagram(model);

    const parsed = parseDiagram(text);

    expect(parsed.kind).toBe("flowchart");

    if (parsed.kind !== "flowchart") {
      return;
    }

    expect(parsed.direction).toBe(model.direction);
    expect(parsed.nodes.map((node) => node.id)).toEqual(model.nodes.map((node) => node.id));
    expect(parsed.edges.map((edge) => [edge.source, edge.target])).toEqual(
      model.edges.map((edge) => [edge.source, edge.target]),
    );
  });

  it("round-trips a sequence diagram", () => {
    const model = emptyModel("sequence");

    const text = serializeDiagram(model);

    const parsed = parseDiagram(text);

    expect(parsed.kind).toBe("sequence");

    if (parsed.kind !== "sequence") {
      return;
    }

    expect(parsed.participants.map((p) => p.id)).toEqual(["Alice", "Bob"]);
    expect(parsed.messages[0]?.label).toBe("Hallo");
  });

  it("round-trips a pie chart", () => {
    const model = emptyModel("pie");

    const text = serializeDiagram(model);

    const parsed = parseDiagram(text);

    expect(parsed.kind).toBe("pie");

    if (parsed.kind !== "pie") {
      return;
    }

    expect(parsed.slices.map((slice) => [slice.label, slice.value])).toEqual([
      ["A", 40],
      ["B", 60],
    ]);
  });

  it("falls back to raw for unknown mermaid", () => {
    const text = "mindmap\n  root((idea))";

    const parsed = parseDiagram(text);

    expect(parsed).toEqual({ kind: "raw", text });
  });

  it("falls back to raw for unsupported flowchart syntax", () => {
    const text = "flowchart TD\n  A:::class --> B";

    const parsed = parseDiagram(text);

    expect(parsed.kind).toBe("raw");
  });

  it("serializes labeled flowchart edges", () => {
    const text = serializeDiagram({
      kind: "flowchart",
      direction: "LR",
      nodes: [
        { id: "A", label: "Start", shape: "rect" },
        { id: "B", label: "End", shape: "rect" },
      ],
      edges: [{ id: "e1", source: "A", target: "B", label: "go" }],
    });

    expect(text).toContain("flowchart LR");
    expect(text).toContain("A -->|go| B");
  });
});
