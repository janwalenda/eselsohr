import type { H3Event } from 'h3'
import { buildAttachmentProxyBase } from '../../../../../../shared/collective-attachments'
import { getPage } from '../../../../../utils/nc-collectives'
import { uploadAttachmentFile } from '../../../../../utils/nc-webdav'

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

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'file' && part.data?.length)
  if (!filePart?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file upload' })
  }

  const fileName = filePart.filename ?? 'upload'
  const contentType = filePart.type ?? 'application/octet-stream'
  const page = await getPage(event, collectiveId, pageId)
  const uploaded = await uploadAttachmentFile(
    event,
    page,
    fileName,
    filePart.data,
    contentType,
  )

  const proxyBase = buildAttachmentProxyBase(collectiveId, pageId)
  const encoded = uploaded.path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')

  return {
    path: uploaded.path,
    url: `${proxyBase}/${encoded}`,
  }
})
