<script setup lang="ts">
import { renderMarkdownBody } from "@/lib/nc-text/editor/markdownit";
import { parseMarkdownFile } from "~~/shared/frontmatter";
import type { CollectivePage } from "~~/shared/collectives";
import { resolveWikiLinkTarget } from "~~/shared/wiki-links";

const props = defineProps<{
  content: string;
  pages?: Pick<CollectivePage, "id" | "title">[];
  token?: string;
}>();

const renderedHtml = computed(() =>
  renderMarkdownBody(parseMarkdownFile(props.content || "").body, {
    pages: props.pages ?? [],
  }),
);

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
  <article class="prose max-w-none" v-html="renderedHtml" @click="handleArticleClick" />
</template>
