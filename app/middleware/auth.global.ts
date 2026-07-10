export default defineNuxtRouteMiddleware(async (to) => {
  const { session, ready, fetchSession } = useNcSession();

  if (!ready.value) {
    await fetchSession();
  }

  if (to.path.startsWith("/app") && !session.value) {
    return navigateTo("/login");
  }

  if (to.path === "/login" && session.value) {
    return navigateTo("/app");
  }
});
