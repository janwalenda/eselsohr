import type { FlowchartDirection, FlowchartModel, FlowchartNodeShape } from "@/lib/mermaid/types";
import type { Connection, Edge, Node } from "@vue-flow/core";

export function useFlowchartCanvas(model: Ref<FlowchartModel>) {
  const selectedNodeId = ref<string | null>(null);

  const connectFromId = ref<string | null>(null);

  let nodeCounter = model.value.nodes.length;

  let edgeCounter = model.value.edges.length;

  const flowNodes = computed<Node[]>(() =>
    model.value.nodes.map((node, index) => ({
      id: node.id,
      position: { x: 40 + (index % 3) * 180, y: 40 + Math.floor(index / 3) * 110 },
      data: { label: node.label, shape: node.shape ?? "rect" },
      label: node.label,
      class: selectedNodeId.value === node.id ? "diagram-flow-node--selected" : "",
    })),
  );

  const flowEdges = computed<Edge[]>(() =>
    model.value.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: false,
    })),
  );

  const selectedNode = computed(
    () => model.value.nodes.find((node) => node.id === selectedNodeId.value) ?? null,
  );

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }

    edgeCounter += 1;
    model.value = {
      ...model.value,
      edges: [
        ...model.value.edges,
        { id: `e${edgeCounter}`, source: connection.source, target: connection.target },
      ],
    };
  }

  function addNode() {
    nodeCounter += 1;
    const id = `N${nodeCounter}`;

    model.value = {
      ...model.value,
      nodes: [...model.value.nodes, { id, label: `Knoten ${nodeCounter}`, shape: "rect" }],
    };
    selectedNodeId.value = id;
  }

  function removeSelectedNode() {
    if (!selectedNodeId.value) {
      return;
    }

    const id = selectedNodeId.value;

    model.value = {
      ...model.value,
      nodes: model.value.nodes.filter((node) => node.id !== id),
      edges: model.value.edges.filter((edge) => edge.source !== id && edge.target !== id),
    };
    selectedNodeId.value = null;
    connectFromId.value = null;
  }

  function updateSelectedLabel(label: string) {
    if (!selectedNodeId.value) {
      return;
    }

    model.value = {
      ...model.value,
      nodes: model.value.nodes.map((node) =>
        node.id === selectedNodeId.value ? { ...node, label } : node,
      ),
    };
  }

  function updateSelectedShape(shape: FlowchartNodeShape) {
    if (!selectedNodeId.value) {
      return;
    }

    model.value = {
      ...model.value,
      nodes: model.value.nodes.map((node) =>
        node.id === selectedNodeId.value ? { ...node, shape } : node,
      ),
    };
  }

  function setDirection(direction: FlowchartDirection) {
    model.value = { ...model.value, direction };
  }

  function onNodeClick(payload: { node: Node }) {
    const id = payload.node.id;

    if (connectFromId.value && connectFromId.value !== id) {
      edgeCounter += 1;
      model.value = {
        ...model.value,
        edges: [
          ...model.value.edges,
          { id: `e${edgeCounter}`, source: connectFromId.value, target: id },
        ],
      };
      connectFromId.value = null;
      selectedNodeId.value = id;
      return;
    }

    selectedNodeId.value = id;
  }

  function startConnectMode() {
    connectFromId.value = selectedNodeId.value;
  }

  return {
    selectedNodeId,
    connectFromId,
    flowNodes,
    flowEdges,
    selectedNode,
    onConnect,
    addNode,
    removeSelectedNode,
    updateSelectedLabel,
    updateSelectedShape,
    setDirection,
    onNodeClick,
    startConnectMode,
  };
}
