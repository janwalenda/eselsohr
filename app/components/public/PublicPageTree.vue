<script setup lang="ts">
import type { CollectivePageNode } from "~~/shared/collectives";

defineProps<{
  token: string;
  currentPageId: number | null;
  pages: CollectivePageNode[];
  depth?: number;
}>();
</script>

<template>
  <ul class="space-y-1" :class="depth ? 'border-l pl-3' : ''">
    <li v-for="page in pages" :key="page.id" class="space-y-1">
      <NuxtLink
        :to="`/s/${encodeURIComponent(token)}/${page.id}`"
        class="block rounded-md px-2 py-1 text-sm hover:bg-muted"
        :class="
          page.id === currentPageId
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground'
        "
      >
        {{ page.title }}
      </NuxtLink>

      <PublicPageTree
        v-if="page.children.length > 0"
        :token="token"
        :current-page-id="currentPageId"
        :pages="page.children"
        :depth="(depth ?? 0) + 1"
      />
    </li>
  </ul>
</template>
