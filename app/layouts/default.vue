<script setup lang="ts">
const { session, loggedIn, signOut } = useNcSession();

const nextcloudHost = computed(() => {
  if (!session.value) {
    return "";
  }

  try {
    return new URL(session.value.ncUrl).host;
  } catch {
    return session.value.ncUrl;
  }
});

async function handleSignOut() {
  await signOut();
  await navigateTo("/login");
}
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground">
    <header class="border-b border-border px-4 py-3">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <NuxtLink to="/" class="font-semibold tracking-tight"> Eselsohr </NuxtLink>
        <nav class="flex items-center gap-3 text-sm text-muted-foreground">
          <ClientOnly>
            <template #fallback>
              <span class="opacity-50">…</span>
            </template>
            <!-- <div v-if="loggedIn" class="flex items-center gap-2">
              <span class="max-w-56 truncate text-foreground">
                {{ session?.loginName }}@{{ nextcloudHost }}
              </span>
              <Button variant="outline" size="sm" @click="handleSignOut"> Abmelden </Button>
            </div> -->
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
