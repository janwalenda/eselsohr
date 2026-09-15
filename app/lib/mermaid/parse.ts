import type {
  ClassModel,
  ClassRelation,
  DiagramModel,
  ErModel,
  FlowchartDirection,
  FlowchartModel,
  FlowchartNode,
  FlowchartNodeShape,
  GanttModel,
  PieModel,
  SequenceModel,
  StateModel,
} from "./types";

function stripComments(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/%%.*$/, "").trimEnd())
    .join("\n");
}

function nonEmptyLines(text: string) {
  return stripComments(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function detectKind(firstLine: string): DiagramModel["kind"] | null {
  const lower = firstLine.toLowerCase();

  if (lower.startsWith("flowchart") || lower.startsWith("graph ")) {
    return "flowchart";
  }

  if (lower.startsWith("statediagram")) {
    return "state";
  }

  if (lower.startsWith("sequencediagram")) {
    return "sequence";
  }

  if (lower.startsWith("classdiagram")) {
    return "class";
  }

  if (lower.startsWith("erdiagram")) {
    return "er";
  }

  if (lower.startsWith("gantt")) {
    return "gantt";
  }

  if (lower.startsWith("pie")) {
    return "pie";
  }

  return null;
}

function raw(text: string): DiagramModel {
  return { kind: "raw", text };
}

function parseFlowchartNodeToken(token: string): FlowchartNode | null {
  const trimmed = token.trim();

  const stadium = /^([A-Za-z0-9_]+)\(\[(.+)\]\)$/.exec(trimmed);

  if (stadium) {
    return { id: stadium[1]!, label: stadium[2]!, shape: "stadium" };
  }

  const circle = /^([A-Za-z0-9_]+)\(\((.+)\)\)$/.exec(trimmed);

  if (circle) {
    return { id: circle[1]!, label: circle[2]!, shape: "circle" };
  }

  const round = /^([A-Za-z0-9_]+)\((.+)\)$/.exec(trimmed);

  if (round) {
    return { id: round[1]!, label: round[2]!, shape: "round" };
  }

  const diamond = /^([A-Za-z0-9_]+)\{(.+)\}$/.exec(trimmed);

  if (diamond) {
    return { id: diamond[1]!, label: diamond[2]!, shape: "diamond" };
  }

  const rect = /^([A-Za-z0-9_]+)\[(.+)\]$/.exec(trimmed);

  if (rect) {
    return { id: rect[1]!, label: rect[2]!, shape: "rect" };
  }

  const bare = /^([A-Za-z0-9_]+)$/.exec(trimmed);

  if (bare) {
    return { id: bare[1]!, label: bare[1]!, shape: "rect" };
  }

  return null;
}

function ensureNode(
  nodes: Map<string, FlowchartNode>,
  id: string,
  label?: string,
  shape?: FlowchartNodeShape,
) {
  const existing = nodes.get(id);

  if (!existing) {
    nodes.set(id, { id, label: label ?? id, shape: shape ?? "rect" });
    return;
  }

  if (label && label !== id) {
    existing.label = label;
  }

  if (shape) {
    existing.shape = shape;
  }
}

function parseFlowchart(lines: string[]): FlowchartModel | null {
  const header = lines[0]!;

  const directionMatch = /^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i.exec(header);

  const direction = (directionMatch?.[1]?.toUpperCase() ?? "TD") as FlowchartDirection;

  const nodes = new Map<string, FlowchartNode>();

  const edges: FlowchartModel["edges"] = [];

  let edgeCounter = 0;

  for (const line of lines.slice(1)) {
    const labeledEdge = /^(.+?)\s*-->\|([^|]*)\|\s*(.+)$/.exec(line);

    if (labeledEdge) {
      const sourceToken = labeledEdge[1]!;

      const targetToken = labeledEdge[3]!;

      const source = parseFlowchartNodeToken(sourceToken);

      const target = parseFlowchartNodeToken(targetToken);

      if (!source || !target) {
        return null;
      }

      ensureNode(nodes, source.id, source.label, source.shape);
      ensureNode(nodes, target.id, target.label, target.shape);
      edges.push({
        id: `e${++edgeCounter}`,
        source: source.id,
        target: target.id,
        label: labeledEdge[2]?.trim() || undefined,
      });
      continue;
    }

    const plainEdge = /^(.+?)\s*-->\s*(.+)$/.exec(line);

    if (plainEdge) {
      const source = parseFlowchartNodeToken(plainEdge[1]!);

      const target = parseFlowchartNodeToken(plainEdge[2]!);

      if (!source || !target) {
        return null;
      }

      ensureNode(nodes, source.id, source.label, source.shape);
      ensureNode(nodes, target.id, target.label, target.shape);
      edges.push({
        id: `e${++edgeCounter}`,
        source: source.id,
        target: target.id,
      });
      continue;
    }

    const node = parseFlowchartNodeToken(line);

    if (!node) {
      return null;
    }

    ensureNode(nodes, node.id, node.label, node.shape);
  }

  return {
    kind: "flowchart",
    direction,
    nodes: [...nodes.values()],
    edges,
  };
}

function parseState(lines: string[]): StateModel | null {
  const states = new Map<string, { id: string; label: string }>();

  const transitions: StateModel["transitions"] = [];

  let transitionCounter = 0;

  for (const line of lines.slice(1)) {
    const labeled = /^([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)\s*:\s*(.+)$/.exec(line);

    if (labeled) {
      const source = labeled[1]!;

      const target = labeled[2]!;

      if (!states.has(source)) {
        states.set(source, { id: source, label: source });
      }

      if (!states.has(target)) {
        states.set(target, { id: target, label: target });
      }

      transitions.push({
        id: `t${++transitionCounter}`,
        source,
        target,
        label: labeled[3]!.trim(),
      });
      continue;
    }

    const plain = /^([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)$/.exec(line);

    if (plain) {
      const source = plain[1]!;

      const target = plain[2]!;

      if (!states.has(source)) {
        states.set(source, { id: source, label: source });
      }

      if (!states.has(target)) {
        states.set(target, { id: target, label: target });
      }

      transitions.push({ id: `t${++transitionCounter}`, source, target });
      continue;
    }

    const named = /^([A-Za-z0-9_]+)\s*:\s*(.+)$/.exec(line);

    if (named) {
      states.set(named[1]!, { id: named[1]!, label: named[2]!.trim() });
      continue;
    }

    return null;
  }

  return {
    kind: "state",
    states: [...states.values()],
    transitions,
  };
}

function parseSequence(lines: string[]): SequenceModel | null {
  const participants = new Map<string, { id: string; label: string }>();

  const messages: SequenceModel["messages"] = [];

  let messageCounter = 0;

  for (const line of lines.slice(1)) {
    const participantAs = /^participant\s+([A-Za-z0-9_]+)\s+as\s+(.+)$/i.exec(line);

    if (participantAs) {
      participants.set(participantAs[1]!, {
        id: participantAs[1]!,
        label: participantAs[2]!.trim(),
      });
      continue;
    }

    const participant = /^participant\s+([A-Za-z0-9_]+)$/i.exec(line);

    if (participant) {
      participants.set(participant[1]!, { id: participant[1]!, label: participant[1]! });
      continue;
    }

    const message = /^([A-Za-z0-9_]+)\s*(-->>|->>|->|--)\s*([A-Za-z0-9_]+)\s*:\s*(.+)$/.exec(line);

    if (message) {
      const from = message[1]!;

      const to = message[3]!;

      const arrow = message[2]!;

      if (!participants.has(from)) {
        participants.set(from, { id: from, label: from });
      }

      if (!participants.has(to)) {
        participants.set(to, { id: to, label: to });
      }

      messages.push({
        id: `m${++messageCounter}`,
        from,
        to,
        label: message[4]!.trim(),
        dashed: arrow.startsWith("--"),
      });
      continue;
    }

    return null;
  }

  return {
    kind: "sequence",
    participants: [...participants.values()],
    messages,
  };
}

function parseClassRelationType(arrow: string): ClassRelation["type"] | null {
  if (arrow === "<|--" || arrow === "--|>") {
    return "inheritance";
  }

  if (arrow === "*--" || arrow === "--*") {
    return "composition";
  }

  if (arrow === "o--" || arrow === "--o") {
    return "aggregation";
  }

  if (arrow === "-->" || arrow === "<--") {
    return "association";
  }

  return null;
}

function parseClass(lines: string[]): ClassModel | null {
  const classes = new Map<string, { id: string; name: string; members: string[] }>();

  const relations: ClassModel["relations"] = [];

  let relationCounter = 0;

  let i = 1;

  while (i < lines.length) {
    const line = lines[i]!;

    const classOpen = /^class\s+([A-Za-z0-9_]+)\s*\{$/.exec(line);

    if (classOpen) {
      const name = classOpen[1]!;

      const members: string[] = [];

      i += 1;

      while (i < lines.length && lines[i] !== "}") {
        members.push(lines[i]!);
        i += 1;
      }

      if (lines[i] !== "}") {
        return null;
      }

      classes.set(name, { id: name, name, members });
      i += 1;
      continue;
    }

    const classBare = /^class\s+([A-Za-z0-9_]+)$/.exec(line);

    if (classBare) {
      const name = classBare[1]!;

      classes.set(name, { id: name, name, members: [] });
      i += 1;
      continue;
    }

    const relation =
      /^([A-Za-z0-9_]+)\s+(<\|--|--\|>|\*--|--\*|o--|--o|-->|<--)\s+([A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/.exec(
        line,
      );

    if (relation) {
      const type = parseClassRelationType(relation[2]!);

      if (!type) {
        return null;
      }

      const from = relation[1]!;

      const to = relation[3]!;

      if (!classes.has(from)) {
        classes.set(from, { id: from, name: from, members: [] });
      }

      if (!classes.has(to)) {
        classes.set(to, { id: to, name: to, members: [] });
      }

      relations.push({
        id: `r${++relationCounter}`,
        from,
        to,
        type,
        label: relation[4]?.trim() || undefined,
      });
      i += 1;
      continue;
    }

    return null;
  }

  return {
    kind: "class",
    classes: [...classes.values()],
    relations,
  };
}

function parseEr(lines: string[]): ErModel | null {
  const entities = new Map<string, { id: string; name: string; attributes: string[] }>();

  const relations: ErModel["relations"] = [];

  let relationCounter = 0;

  let i = 1;

  while (i < lines.length) {
    const line = lines[i]!;

    const entityOpen = /^([A-Za-z0-9_]+)\s*\{$/.exec(line);

    if (entityOpen) {
      const name = entityOpen[1]!;

      const attributes: string[] = [];

      i += 1;

      while (i < lines.length && lines[i] !== "}") {
        attributes.push(lines[i]!);
        i += 1;
      }

      if (lines[i] !== "}") {
        return null;
      }

      entities.set(name, { id: name, name, attributes });
      i += 1;
      continue;
    }

    const relation =
      /^([A-Za-z0-9_]+)\s+([|o}{]{2}--[|o}{]{2})\s+([A-Za-z0-9_]+)(?:\s*:\s*"?([^"]*)"?)?$/.exec(
        line,
      );

    if (relation) {
      const from = relation[1]!;

      const to = relation[3]!;

      if (!entities.has(from)) {
        entities.set(from, { id: from, name: from, attributes: [] });
      }

      if (!entities.has(to)) {
        entities.set(to, { id: to, name: to, attributes: [] });
      }

      relations.push({
        id: `r${++relationCounter}`,
        from,
        to,
        cardinality: relation[2]!,
        label: relation[4]?.trim() || undefined,
      });
      i += 1;
      continue;
    }

    const bareEntity = /^([A-Za-z0-9_]+)$/.exec(line);

    if (bareEntity) {
      const name = bareEntity[1]!;

      entities.set(name, { id: name, name, attributes: [] });
      i += 1;
      continue;
    }

    return null;
  }

  return {
    kind: "er",
    entities: [...entities.values()],
    relations,
  };
}

function parseGantt(lines: string[]): GanttModel | null {
  let title = "Projekt";

  let dateFormat = "YYYY-MM-DD";

  let currentSection = "Tasks";

  const tasks: GanttModel["tasks"] = [];

  let taskCounter = 0;

  for (const line of lines.slice(1)) {
    if (line.toLowerCase().startsWith("title ")) {
      title = line.slice(6).trim();
      continue;
    }

    if (line.toLowerCase().startsWith("dateformat ")) {
      dateFormat = line.slice(11).trim();
      continue;
    }

    if (line.toLowerCase().startsWith("section ")) {
      currentSection = line.slice(8).trim();
      continue;
    }

    const task = /^(.+?)\s*:([A-Za-z0-9_-]+),\s*([^,]+),\s*(.+)$/.exec(line);

    if (task) {
      tasks.push({
        id: task[2]!,
        section: currentSection,
        name: task[1]!.trim(),
        start: task[3]!.trim(),
        end: task[4]!.trim(),
      });
      continue;
    }

    const taskAuto = /^(.+?)\s*:\s*([^,]+),\s*(.+)$/.exec(line);

    if (taskAuto) {
      tasks.push({
        id: `t${++taskCounter}`,
        section: currentSection,
        name: taskAuto[1]!.trim(),
        start: taskAuto[2]!.trim(),
        end: taskAuto[3]!.trim(),
      });
      continue;
    }

    return null;
  }

  return {
    kind: "gantt",
    title,
    dateFormat,
    tasks,
  };
}

function parsePie(lines: string[]): PieModel | null {
  const header = lines[0]!;

  const titleMatch = /^pie(?:\s+title\s+(.+))?$/i.exec(header);

  const title = titleMatch?.[1]?.trim() || "Verteilung";

  const slices: PieModel["slices"] = [];

  let sliceCounter = 0;

  for (const line of lines.slice(1)) {
    const slice = /^"([^"]+)"\s*:\s*([0-9]+(?:\.[0-9]+)?)$/.exec(line);

    if (!slice) {
      return null;
    }

    slices.push({
      id: `s${++sliceCounter}`,
      label: slice[1]!,
      value: Number(slice[2]),
    });
  }

  return {
    kind: "pie",
    title,
    slices,
  };
}

export function parseDiagram(text: string): DiagramModel {
  const trimmed = text.trim();

  if (!trimmed) {
    return raw(text);
  }

  const lines = nonEmptyLines(trimmed);

  if (lines.length === 0) {
    return raw(text);
  }

  const kind = detectKind(lines[0]!);

  if (!kind) {
    return raw(text);
  }

  try {
    let parsed: DiagramModel | null = null;

    switch (kind) {
      case "flowchart":
        parsed = parseFlowchart(lines);
        break;
      case "state":
        parsed = parseState(lines);
        break;
      case "sequence":
        parsed = parseSequence(lines);
        break;
      case "class":
        parsed = parseClass(lines);
        break;
      case "er":
        parsed = parseEr(lines);
        break;
      case "gantt":
        parsed = parseGantt(lines);
        break;
      case "pie":
        parsed = parsePie(lines);
        break;
      default:
        parsed = null;
    }

    return parsed ?? raw(text);
  } catch {
    return raw(text);
  }
}
