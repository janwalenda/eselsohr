<script setup lang="ts">
import markdownIt from "@/lib/nc-text/editor/markdownit";

const props = defineProps<{
  content: string;
}>();

const renderedHtml = computed(() => markdownIt.render(props.content || ""));
</script>

<template>
  <article class="prose max-w-none" v-html="renderedHtml" />
</template>
