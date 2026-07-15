import { navigateToCollective } from '../composables/useCollectiveNavigation'

export default defineNuxtRouteMiddleware(async (to) => {
  const collectiveId = Number(to.params.collectiveId)
  if (!Number.isFinite(collectiveId) || to.params.pageId) {
    return
  }

  if (!/^\/app\/\d+\/?$/.test(to.path)) {
    return
  }

  return navigateToCollective(collectiveId, { replace: true })
})
