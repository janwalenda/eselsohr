<script setup lang="ts">
import { flattenPageTree, getPageBreadcrumb } from "@/composables/useCollectivePages";
import PublicPageView from "@/components/public/PublicPageView.vue";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const route = useRoute();

const token = computed(() => String(route.params.token || ""));

const routePageId = computed(() => {
  const value = Number(route.params.pageId);

  return Number.isFinite(value) ? value : null;
});

const shareState = usePublicShare(token, routePageId);

const flatPages = computed(() => flattenPageTree(shareState.pages.value ?? []));

const currentTrail = computed(() =>
  shareState.pageId.value
    ? getPageBreadcrumb(shareState.pages.value ?? [], shareState.pageId.value)
    : [],
);

const currentPage = computed(
  () =>
    flatPages.value.find((page) => page.id === shareState.pageId.value) ??
    shareState.pageContent.value?.page ??
    null,
);

const routeErrorMessage = computed(
  () => shareState.pagesError.value?.message || shareState.contentError.value?.message || "",
);
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <main class="min-w-0 flex-1">
        <div class="space-y-4">
          <Breadcrumb v-if="currentPage">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink as-child>
                  <NuxtLink :to="`/s/${encodeURIComponent(token)}`"> Shared Space </NuxtLink>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <template v-for="page in currentTrail" :key="page.id">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage v-if="page.id === currentTrail.at(-1)?.id">
                    {{ page.title }}
                  </BreadcrumbPage>
                  <BreadcrumbLink v-else as-child>
                    <NuxtLink :to="`/s/${encodeURIComponent(token)}/${page.id}`">
                      {{ page.title }}
                    </NuxtLink>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </template>
            </BreadcrumbList>
          </Breadcrumb>

          <div
            v-if="shareState.pagesPending.value || shareState.contentPending.value"
            class="space-y-4"
          >
            <Skeleton class="h-8 w-2/3" />
            <Skeleton class="h-[60vh] w-full rounded-xl" />
          </div>

          <Card
            v-else-if="routeErrorMessage"
            class="border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {{ routeErrorMessage }}
          </Card>

          <Card v-else-if="shareState.pageContent.value && currentPage" class="p-6 md:p-8">
            <div class="space-y-6">
              <div class="space-y-2">
                <h1 class="text-3xl font-semibold tracking-tight">{{ currentPage.title }}</h1>
                <p class="text-sm text-muted-foreground">Öffentlicher Leselink</p>
              </div>

              <PublicPageView :content="shareState.pageContent.value.content" />
            </div>
          </Card>

          <div v-else class="text-sm text-muted-foreground">
            Seiteninhalt konnte nicht geladen werden.
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
