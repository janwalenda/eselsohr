<script setup lang="ts">
import { renderMarkdownBody } from "@/lib/nc-text/editor/markdownit";
import { parseMarkdownFile } from "~~/shared/frontmatter";
import type { CollectivePage } from "~~/shared/collectives";
import { resolveWikiLinkTarget } from "~~/shared/wiki-links";
import { renderMermaid } from "@/composables/useMermaidRender";

const props = defineProps<{
  content: string;
  pages?: Pick<CollectivePage, "id" | "title">[];
  token?: string;
}>();

const articleRef = ref<HTMLElement | null>(null);

const renderedHtml = computed(() =>
  renderMarkdownBody(parseMarkdownFile(props.content || "").body, {
    pages: props.pages ?? [],
  }),
);

async function enhanceMermaidBlocks() {
  if (!import.meta.client || !articleRef.value) {
    return;
  }

  const blocks = articleRef.value.querySelectorAll("pre > code.language-mermaid");

  for (const code of blocks) {
    const pre = code.parentElement;

    if (!(pre instanceof HTMLElement)) {
      continue;
    }

    if (pre.dataset.mermaidEnhanced === "true") {
      continue;
    }

    const source = code.textContent ?? "";
    const result = await renderMermaid(source);
    const wrapper = document.createElement("div");

    wrapper.className = "mermaid-block mermaid-block--readonly";
    wrapper.dataset.mermaidEnhanced = "true";

    if (result.ok) {
      wrapper.innerHTML = result.svg;
    } else {
      wrapper.classList.add("mermaid-block--error");
      const hint = document.createElement("p");

      hint.className = "mermaid-block__error";
      hint.textContent = result.error;
      const fallback = document.createElement("pre");

      fallback.className = "mermaid-block__fallback";
      fallback.textContent = source;
      wrapper.append(hint, fallback);
    }

    pre.replaceWith(wrapper);
  }
}

watch(
  renderedHtml,
  async () => {
    await nextTick();
    await enhanceMermaidBlocks();
  },
  { flush: "post" },
);

onMounted(() => {
  void enhanceMermaidBlocks();
});

function handleArticleClick(event: MouseEvent) {
  if (event.button !== 0) {
    return;
  }

  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const wikiLink = target.closest("[data-wiki-link]");

  if (!(wikiLink instanceof HTMLElement)) {
    return;
  }

  event.preventDefault();

  const linkTarget = wikiLink.getAttribute("data-wiki-target")?.trim() ?? "";

  if (!linkTarget || !props.token) {
    return;
  }

  const pageIdAttr = wikiLink.getAttribute("data-wiki-page-id");
  const resolvedPageId = pageIdAttr
    ? Number(pageIdAttr)
    : (resolveWikiLinkTarget(linkTarget, props.pages ?? [])?.id ?? null);

  if (!resolvedPageId || !Number.isFinite(resolvedPageId)) {
    return;
  }

  void navigateTo(`/s/${encodeURIComponent(props.token)}/${resolvedPageId}`);
}
</script>

<template>
  <article
    ref="articleRef"
    class="prose max-w-none"
    v-html="renderedHtml"
    @click="handleArticleClick"
  />
</template>
