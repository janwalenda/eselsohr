<script setup lang="ts">
const { loggedIn } = useNcSession();
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground">
    <header class="border-b border-border px-4 py-3 sticky top-0 z-10 bg-background">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <NuxtLink to="/" class="font-semibold tracking-tight"> Eselsohr </NuxtLink>
        <nav class="flex items-center gap-3 text-sm text-muted-foreground">
          <ClientOnly>
            <template #fallback>
              <span class="opacity-50">…</span>
            </template>
            <NuxtLink v-if="!loggedIn" to="/login">
              <Button size="sm"> Anmelden </Button>
            </NuxtLink>
          </ClientOnly>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-3xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
