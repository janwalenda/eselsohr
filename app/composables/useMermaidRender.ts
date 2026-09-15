/**
 * Client-only Mermaid rendering helper. Dynamically imports the library so SSR
 * and Netlify builds stay free of DOM-dependent mermaid code.
 */

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

let mermaidReady: Promise<MermaidApi> | null = null;

let renderCounter = 0;

async function getMermaid() {
  if (!import.meta.client) {
    throw new Error("Mermaid can only render in the browser");
  }

  if (!mermaidReady) {
    mermaidReady = import("mermaid").then((mod) => {
      const mermaid = mod.default as MermaidApi;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "default",
        flowchart: { htmlLabels: false },
      });

      return mermaid;
    });
  }

  return mermaidReady;
}

export type MermaidRenderResult = { ok: true; svg: string } | { ok: false; error: string };

export async function renderMermaid(code: string): Promise<MermaidRenderResult> {
  const trimmed = code.trim();

  if (!trimmed) {
    return { ok: false, error: "Leeres Diagramm" };
  }

  try {
    const mermaid = await getMermaid();

    const id = `eselsohr-mermaid-${++renderCounter}`;

    const { svg } = await mermaid.render(id, trimmed);

    return { ok: true, svg };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mermaid-Renderfehler";

    return { ok: false, error: message };
  }
}

export function useMermaidRender() {
  return { renderMermaid };
}
