<script setup lang="ts">
import type { CollectivePageNode, CollectiveSummary } from "~~/shared/collectives";
import AppIcon from "@/components/AppIcon.vue";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

defineProps<{
  collective: CollectiveSummary | null;
  trail: CollectivePageNode[];
}>();
</script>

<template>
  <Breadcrumb v-if="collective">
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbPage v-if="trail.length === 0" class="inline-flex items-center gap-1.5">
          <AppIcon
            :icon="collective.icon"
            :collective-id="collective.id"
            :owner-page-id="collective.iconOwnerPageId"
            :fallback-emoji="collective.emoji"
            fallback-lucide="folder-open"
          />
          {{ collective.name }}
        </BreadcrumbPage>
        <BreadcrumbLink v-else as-child>
          <NuxtLink :to="`/app/${collective.id}`" class="inline-flex items-center gap-1.5">
            <AppIcon
              :icon="collective.icon"
              :collective-id="collective.id"
              :owner-page-id="collective.iconOwnerPageId"
              :fallback-emoji="collective.emoji"
              fallback-lucide="folder-open"
            />
            {{ collective.name }}
          </NuxtLink>
        </BreadcrumbLink>
      </BreadcrumbItem>

      <template v-for="page in trail" :key="page.id">
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage
            v-if="page.id === trail.at(-1)?.id"
            class="inline-flex items-center gap-1.5"
          >
            <AppIcon
              :icon="page.icon"
              :collective-id="collective.id"
              :owner-page-id="page.id"
              fallback-lucide="file-text"
            />
            {{ page.title }}
          </BreadcrumbPage>
          <BreadcrumbLink v-else as-child>
            <NuxtLink
              :to="`/app/${collective.id}/${page.id}`"
              class="inline-flex items-center gap-1.5"
            >
              <AppIcon
                :icon="page.icon"
                :collective-id="collective.id"
                :owner-page-id="page.id"
                fallback-lucide="file-text"
              />
              {{ page.title }}
            </NuxtLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
