<script setup lang="ts">
import type { CollectivePageNode, CollectiveSummary } from '~~/shared/collectives'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

defineProps<{
  collective: CollectiveSummary | null
  trail: CollectivePageNode[]
}>()
</script>

<template>
  <Breadcrumb v-if="collective">
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink as-child>
          <NuxtLink :to="`/app/${collective.id}`">
            {{ collective.name }}
          </NuxtLink>
        </BreadcrumbLink>
      </BreadcrumbItem>

      <template v-for="page in trail" :key="page.id">
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <NuxtLink :to="`/app/${collective.id}/${page.id}`">
              {{ page.title }}
            </NuxtLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
