import type { H3Event } from 'h3'
import { createPage } from '../../../utils/nc-collectives'

function getCollectiveId(event: H3Event) {
  const value = Number(getRouterParam(event, 'collectiveId'))
  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid collective ID' })
  }
  return value
}

export default defineEventHandler(async (event) => {
  const collectiveId = getCollectiveId(event)
  const body = await readBody<{ title?: string, parentId?: number }>(event)
  const title = body.title?.trim()

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'A title is required' })
  }

  const page = await createPage(event, collectiveId, {
    title,
    parentId: body.parentId,
  })

  return { page }
})
