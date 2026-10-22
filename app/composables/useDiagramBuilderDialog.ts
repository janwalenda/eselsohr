import { useMediaQuery } from "@vueuse/core";
import { renderMermaid } from "@/composables/useMermaidRender";
import { parseDiagram } from "@/lib/mermaid/parse";
import { serializeDiagram } from "@/lib/mermaid/serialize";
import {
  emptyModel,
  type ClassModel,
  type DiagramKind,
  type DiagramModel,
  type ErModel,
  type FlowchartModel,
  type GanttModel,
  type PieModel,
  type SequenceModel,
  type StateModel,
} from "@/lib/mermaid/types";

export function useDiagramBuilderDialog(options: {
  open: Ref<boolean>;
  source: MaybeRefOrGetter<string>;
  mode: MaybeRefOrGetter<"insert" | "edit">;
  onConfirm: (source: string) => void;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)", { ssrWidth: 1024 });

  const showCode = ref(false);

  const rawText = ref("");

  const model = ref<DiagramModel>(emptyModel("flowchart"));

  const previewSvg = ref("");

  const previewError = ref("");

  const selectedKind = ref<Exclude<DiagramKind, "raw">>("flowchart");

  function asKindModel<T extends DiagramModel>(_kind: T["kind"]) {
    return computed({
      get: () => model.value as T,
      set: (value: T) => {
        model.value = value;
      },
    });
  }

  const flowchartModel = asKindModel<FlowchartModel>("flowchart");

  const stateModel = asKindModel<StateModel>("state");

  const sequenceModel = asKindModel<SequenceModel>("sequence");

  const classModel = asKindModel<ClassModel>("class");

  const erModel = asKindModel<ErModel>("er");

  const ganttModel = asKindModel<GanttModel>("gantt");

  const pieModel = asKindModel<PieModel>("pie");

  function syncFromSource(source: string) {
    const parsed = parseDiagram(source || serializeDiagram(emptyModel("flowchart")));

    model.value = parsed;
    rawText.value = parsed.kind === "raw" ? parsed.text : serializeDiagram(parsed);

    if (parsed.kind === "raw") {
      showCode.value = true;
      selectedKind.value = "flowchart";
      return;
    }

    selectedKind.value = parsed.kind;
    showCode.value = false;
  }

  watch(
    () => [options.open.value, toValue(options.source)] as const,
    ([isOpen]) => {
      if (isOpen) {
        syncFromSource(toValue(options.source));
      }
    },
    { immediate: true },
  );

  watch(
    model,
    async (next) => {
      if (showCode.value && next.kind !== "raw") {
        rawText.value = serializeDiagram(next);
      }

      const code = next.kind === "raw" ? next.text : serializeDiagram(next);

      const result = await renderMermaid(code);

      if (result.ok) {
        previewSvg.value = result.svg;
        previewError.value = "";
        return;
      }

      previewSvg.value = "";
      previewError.value = result.error;
    },
    { deep: true, immediate: true },
  );

  function switchKind(kind: Exclude<DiagramKind, "raw">) {
    selectedKind.value = kind;

    if (model.value.kind !== kind) {
      model.value = emptyModel(kind);
      showCode.value = false;
    }
  }

  function onRawInput(value: string) {
    rawText.value = value;
    model.value = parseDiagram(value);
  }

  function setOpen(value: boolean) {
    options.open.value = value;
  }

  function confirm() {
    const source =
      model.value.kind === "raw" ? model.value.text.trim() : serializeDiagram(model.value).trim();

    if (!source) {
      return;
    }

    options.onConfirm(source);
    options.open.value = false;
  }

  const title = computed(() =>
    toValue(options.mode) === "edit" ? "Diagramm bearbeiten" : "Diagramm einfügen",
  );

  return {
    isMobile,
    showCode,
    rawText,
    model,
    previewSvg,
    previewError,
    selectedKind,
    flowchartModel,
    stateModel,
    sequenceModel,
    classModel,
    erModel,
    ganttModel,
    pieModel,
    title,
    switchKind,
    onRawInput,
    setOpen,
    confirm,
  };
}
