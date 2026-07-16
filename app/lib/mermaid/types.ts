export type FlowchartDirection = "TD" | "TB" | "LR" | "RL" | "BT";

export type FlowchartNodeShape = "rect" | "round" | "diamond" | "circle" | "stadium";

export type FlowchartNode = {
  id: string;
  label: string;
  shape?: FlowchartNodeShape;
};

export type FlowchartEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type FlowchartModel = {
  kind: "flowchart";
  direction: FlowchartDirection;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
};

export type StateModel = {
  kind: "state";
  states: { id: string; label: string }[];
  transitions: { id: string; source: string; target: string; label?: string }[];
};

export type SequenceMessage = {
  id: string;
  from: string;
  to: string;
  label: string;
  dashed?: boolean;
};

export type SequenceModel = {
  kind: "sequence";
  participants: { id: string; label: string }[];
  messages: SequenceMessage[];
};

export type ClassRelation = {
  id: string;
  from: string;
  to: string;
  type: "inheritance" | "composition" | "aggregation" | "association";
  label?: string;
};

export type ClassModel = {
  kind: "class";
  classes: { id: string; name: string; members: string[] }[];
  relations: ClassRelation[];
};

export type ErRelation = {
  id: string;
  from: string;
  to: string;
  cardinality: string;
  label?: string;
};

export type ErModel = {
  kind: "er";
  entities: { id: string; name: string; attributes: string[] }[];
  relations: ErRelation[];
};

export type GanttTask = {
  id: string;
  section: string;
  name: string;
  start: string;
  end: string;
};

export type GanttModel = {
  kind: "gantt";
  title: string;
  dateFormat: string;
  tasks: GanttTask[];
};

export type PieModel = {
  kind: "pie";
  title: string;
  slices: { id: string; label: string; value: number }[];
};

export type RawModel = {
  kind: "raw";
  text: string;
};

export type DiagramModel =
  | FlowchartModel
  | StateModel
  | SequenceModel
  | ClassModel
  | ErModel
  | GanttModel
  | PieModel
  | RawModel;

export type DiagramKind = DiagramModel["kind"];

export const DIAGRAM_KINDS: Exclude<DiagramKind, "raw">[] = [
  "flowchart",
  "state",
  "sequence",
  "class",
  "er",
  "gantt",
  "pie",
];

export const DIAGRAM_KIND_LABELS: Record<Exclude<DiagramKind, "raw">, string> = {
  flowchart: "Flussdiagramm",
  state: "Zustandsdiagramm",
  sequence: "Sequenzdiagramm",
  class: "Klassendiagramm",
  er: "ER-Diagramm",
  gantt: "Gantt",
  pie: "Kreisdiagramm",
};

export function emptyModel(kind: Exclude<DiagramKind, "raw">): DiagramModel {
  switch (kind) {
    case "flowchart":
      return {
        kind: "flowchart",
        direction: "TD",
        nodes: [
          { id: "A", label: "Start", shape: "stadium" },
          { id: "B", label: "Schritt", shape: "rect" },
        ],
        edges: [{ id: "e1", source: "A", target: "B" }],
      };
    case "state":
      return {
        kind: "state",
        states: [
          { id: "Idle", label: "Idle" },
          { id: "Active", label: "Active" },
        ],
        transitions: [{ id: "t1", source: "Idle", target: "Active", label: "start" }],
      };
    case "sequence":
      return {
        kind: "sequence",
        participants: [
          { id: "Alice", label: "Alice" },
          { id: "Bob", label: "Bob" },
        ],
        messages: [{ id: "m1", from: "Alice", to: "Bob", label: "Hallo" }],
      };
    case "class":
      return {
        kind: "class",
        classes: [
          { id: "Animal", name: "Animal", members: ["+name: string"] },
          { id: "Dog", name: "Dog", members: ["+bark()"] },
        ],
        relations: [{ id: "r1", from: "Dog", to: "Animal", type: "inheritance" }],
      };
    case "er":
      return {
        kind: "er",
        entities: [
          { id: "CUSTOMER", name: "CUSTOMER", attributes: ["string name", "string email"] },
          { id: "ORDER", name: "ORDER", attributes: ["int id", "date created"] },
        ],
        relations: [
          { id: "r1", from: "CUSTOMER", to: "ORDER", cardinality: "||--o{", label: "places" },
        ],
      };
    case "gantt":
      return {
        kind: "gantt",
        title: "Projekt",
        dateFormat: "YYYY-MM-DD",
        tasks: [
          {
            id: "t1",
            section: "Phase 1",
            name: "Aufgabe",
            start: "2026-01-01",
            end: "2026-01-15",
          },
        ],
      };
    case "pie":
      return {
        kind: "pie",
        title: "Verteilung",
        slices: [
          { id: "s1", label: "A", value: 40 },
          { id: "s2", label: "B", value: 60 },
        ],
      };
  }
}
