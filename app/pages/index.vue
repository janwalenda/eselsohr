<script setup lang="ts">
const { loggedIn, fetchSession } = useNcSession()

await fetchSession()
await navigateTo(loggedIn.value ? '/app' : '/login', { replace: true })
</script>

<template>
  <div class="flex min-h-[40vh] items-center justify-center text-muted-foreground">
    Weiterleitung…
  </div>
</template>
