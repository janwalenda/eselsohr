<script setup lang="ts">
import markdownIt from "@/lib/nc-text/editor/markdownit";
import { parseMarkdownFile } from "~~/shared/frontmatter";

const props = defineProps<{
  content: string;
}>();

const renderedHtml = computed(() => markdownIt.render(parseMarkdownFile(props.content || "").body));
</script>

<template>
  <article class="prose max-w-none" v-html="renderedHtml" />
</template>
