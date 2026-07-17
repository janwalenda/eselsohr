<script setup lang="ts">
import CreateCollectiveDialog from "@/components/workspace/CreateCollectiveDialog.vue";
import { Button } from "@/components/ui/button";

definePageMeta({
  layout: "workspace",
});

const { collectives, pending, error } = useCollectives();

const { createOpen, handleCreateCollective } = useCreateCollective();
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-10">
    <Card class="w-full max-w-2xl p-8">
      <div class="space-y-3">
        <h1 class="text-3xl font-semibold tracking-tight">Wähle ein Collective</h1>
        <p class="text-sm text-muted-foreground">
          Nutze die Sidebar links, um in deine Collectives und Seiten zu springen. Mit
          <kbd class="rounded border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          kannst du direkt nach Seiten suchen.
        </p>
      </div>

      <div class="mt-8 space-y-3">
        <Skeleton v-if="pending" class="h-11 w-full" />
        <Skeleton v-if="pending" class="h-11 w-5/6" />

        <Card
          v-else-if="error"
          class="border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {{ error.message }}
        </Card>

        <div v-else-if="collectives.length > 0" class="grid gap-3">
          <NuxtLink
            v-for="collective in collectives"
            :key="collective.id"
            :to="`/app/${collective.id}`"
            class="rounded-lg border p-4 transition hover:bg-accent hover:text-accent-foreground"
          >
            <div class="font-medium">
              {{ collective.emoji ? `${collective.emoji} ` : "" }}{{ collective.name }}
            </div>
            <div class="mt-1 text-sm text-muted-foreground">
              {{ collective.slug }}
            </div>
          </NuxtLink>
        </div>

        <div v-else class="space-y-3">
          <p class="text-sm text-muted-foreground">
            Auf dieser Instanz wurden noch keine Collectives gefunden.
          </p>
          <Button @click="createOpen = true">Collective erstellen</Button>
        </div>
      </div>
    </Card>

    <CreateCollectiveDialog v-model:open="createOpen" @submit="handleCreateCollective" />
  </div>
</template>
