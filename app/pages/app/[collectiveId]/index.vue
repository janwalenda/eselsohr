<script setup lang="ts">
import { toast } from 'vue-sonner'
import { extractApiErrorMessage } from '~~/shared/api-errors'

definePageMeta({
  layout: 'workspace',
  middleware: 'collective-first-page',
})

const route = useRoute()
const collectiveId = computed(() => Number(route.params.collectiveId))
const { collectives } = useCollectives()
const { pages, pending, error, createPage, landingPage } = useCollectivePages(collectiveId)

const currentCollective = computed(() =>
  collectives.value.find(collective => collective.id === collectiveId.value) ?? null,
)

const createOpen = ref(false)

function toMessage(input: unknown) {
  return extractApiErrorMessage(input, 'Die Seite konnte nicht erstellt werden.')
}

async function handleCreate(title: string) {
  try {
    const rootParentId = landingPage.value?.id
    if (!rootParentId) {
      throw new Error('Die Landing-Page des Collectives konnte nicht gefunden werden.')
    }
    const page = await createPage({ title, parentId: rootParentId })
    toast.success('Seite erstellt')
    await navigateTo(`/app/${collectiveId.value}/${page.id}`)
  }
  catch (createError) {
    toast.error(toMessage(createError))
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-10">
    <Card class="w-full max-w-2xl p-8">
      <template v-if="pending">
        <div class="space-y-3">
          <Skeleton class="h-8 w-2/3" />
          <Skeleton class="h-5 w-full" />
          <Skeleton class="h-5 w-5/6" />
        </div>
      </template>

      <template v-else-if="error">
        <h1 class="text-2xl font-semibold tracking-tight">
          Fehler beim Laden
        </h1>
        <p class="mt-3 text-sm text-destructive">
          {{ error.message }}
        </p>
      </template>

      <template v-else-if="(pages ?? []).length === 0">
        <h1 class="text-3xl font-semibold tracking-tight">
          {{ currentCollective?.name || 'Collective' }}
        </h1>
        <p class="mt-3 text-sm text-muted-foreground">
          Dieses Collective enthält noch keine Seiten. Lege die erste Markdown-Seite an, um
          den Workspace zu starten.
        </p>
        <div class="mt-6">
          <Button @click="createOpen = true">
            Erste Seite anlegen
          </Button>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-muted-foreground">
          Weiterleitung zur ersten Seite…
        </p>
      </template>
    </Card>

    <CreatePageDialog
      v-model:open="createOpen"
      :context-label="currentCollective?.name || ''"
      @submit="handleCreate"
    />
  </div>
</template>
