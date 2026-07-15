import type { H3Event } from 'h3'
import { updatePage } from '../../../../utils/nc-collectives'

function getNumericRouteParam(event: H3Event, key: string) {
  const value = Number(getRouterParam(event, key))
  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }
  return value
}

export default defineEventHandler(async (event) => {
  const collectiveId = getNumericRouteParam(event, 'collectiveId')
  const pageId = getNumericRouteParam(event, 'pageId')
  const body = await readBody<{
    title?: string
    parentId?: number | null
    index?: number | null
    subpageOrder?: number[]
  }>(event)

  return {
    page: await updatePage(event, collectiveId, pageId, body),
  }
})
