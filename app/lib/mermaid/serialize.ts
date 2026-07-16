import type {
  ClassModel,
  ClassRelation,
  DiagramModel,
  ErModel,
  FlowchartModel,
  FlowchartNodeShape,
  GanttModel,
  PieModel,
  SequenceModel,
  StateModel,
} from "./types";

function escapeLabel(label: string) {
  return label.replace(/"/g, "#quot;");
}

function flowchartNodeLine(node: FlowchartModel["nodes"][number]) {
  const label = escapeLabel(node.label || node.id);

  const shape: FlowchartNodeShape = node.shape ?? "rect";

  switch (shape) {
    case "round":
      return `  ${node.id}(${label})`;
    case "stadium":
      return `  ${node.id}([${label}])`;
    case "diamond":
      return `  ${node.id}{${label}}`;
    case "circle":
      return `  ${node.id}((${label}))`;
    case "rect":
    default:
      return `  ${node.id}[${label}]`;
  }
}

function serializeFlowchart(model: FlowchartModel) {
  const lines = [`flowchart ${model.direction}`];

  for (const node of model.nodes) {
    lines.push(flowchartNodeLine(node));
  }

  for (const edge of model.edges) {
    if (edge.label?.trim()) {
      lines.push(`  ${edge.source} -->|${escapeLabel(edge.label)}| ${edge.target}`);
    } else {
      lines.push(`  ${edge.source} --> ${edge.target}`);
    }
  }

  return lines.join("\n");
}

function serializeState(model: StateModel) {
  const lines = ["stateDiagram-v2"];

  for (const state of model.states) {
    if (state.label && state.label !== state.id) {
      lines.push(`  ${state.id} : ${state.label}`);
    }
  }

  for (const transition of model.transitions) {
    if (transition.label?.trim()) {
      lines.push(`  ${transition.source} --> ${transition.target} : ${transition.label}`);
    } else {
      lines.push(`  ${transition.source} --> ${transition.target}`);
    }
  }

  return lines.join("\n");
}

function serializeSequence(model: SequenceModel) {
  const lines = ["sequenceDiagram"];

  for (const participant of model.participants) {
    if (participant.label && participant.label !== participant.id) {
      lines.push(`  participant ${participant.id} as ${participant.label}`);
    } else {
      lines.push(`  participant ${participant.id}`);
    }
  }

  for (const message of model.messages) {
    const arrow = message.dashed ? "-->>" : "->>";

    lines.push(`  ${message.from}${arrow}${message.to}: ${message.label}`);
  }

  return lines.join("\n");
}

function relationArrow(type: ClassRelation["type"]) {
  switch (type) {
    case "inheritance":
      return "<|--";
    case "composition":
      return "*--";
    case "aggregation":
      return "o--";
    case "association":
    default:
      return "-->";
  }
}

function serializeClass(model: ClassModel) {
  const lines = ["classDiagram"];

  for (const cls of model.classes) {
    if (cls.members.length === 0) {
      lines.push(`  class ${cls.name}`);
      continue;
    }

    lines.push(`  class ${cls.name} {`);

    for (const member of cls.members) {
      lines.push(`    ${member}`);
    }

    lines.push("  }");
  }

  for (const relation of model.relations) {
    const arrow = relationArrow(relation.type);

    const label = relation.label?.trim() ? ` : ${relation.label}` : "";

    lines.push(`  ${relation.from} ${arrow} ${relation.to}${label}`);
  }

  return lines.join("\n");
}

function serializeEr(model: ErModel) {
  const lines = ["erDiagram"];

  for (const entity of model.entities) {
    if (entity.attributes.length === 0) {
      lines.push(`  ${entity.name}`);
      continue;
    }

    lines.push(`  ${entity.name} {`);

    for (const attribute of entity.attributes) {
      lines.push(`    ${attribute}`);
    }

    lines.push("  }");
  }

  for (const relation of model.relations) {
    const label = relation.label?.trim() ? ` : "${relation.label}"` : "";

    lines.push(`  ${relation.from} ${relation.cardinality} ${relation.to}${label}`);
  }

  return lines.join("\n");
}

function serializeGantt(model: GanttModel) {
  const lines = [
    "gantt",
    `  title ${model.title || "Projekt"}`,
    `  dateFormat ${model.dateFormat || "YYYY-MM-DD"}`,
  ];

  let currentSection = "";

  for (const task of model.tasks) {
    if (task.section !== currentSection) {
      currentSection = task.section;
      lines.push(`  section ${task.section}`);
    }

    lines.push(`  ${task.name} :${task.id}, ${task.start}, ${task.end}`);
  }

  return lines.join("\n");
}

function serializePie(model: PieModel) {
  const lines = [`pie title ${model.title || "Verteilung"}`];

  for (const slice of model.slices) {
    lines.push(`  "${slice.label}" : ${slice.value}`);
  }

  return lines.join("\n");
}

export function serializeDiagram(model: DiagramModel): string {
  switch (model.kind) {
    case "flowchart":
      return serializeFlowchart(model);
    case "state":
      return serializeState(model);
    case "sequence":
      return serializeSequence(model);
    case "class":
      return serializeClass(model);
    case "er":
      return serializeEr(model);
    case "gantt":
      return serializeGantt(model);
    case "pie":
      return serializePie(model);
    case "raw":
      return model.text;
  }
}
