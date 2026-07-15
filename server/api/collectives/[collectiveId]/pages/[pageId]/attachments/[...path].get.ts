import type { H3Event } from 'h3'
import { decodeAttachmentPath, isValidAttachmentRelativePath } from '../../../../../../../shared/collective-attachments'
import { getPage } from '../../../../../../utils/nc-collectives'
import { readAttachmentFile } from '../../../../../../utils/nc-webdav'

function getNumericRouteParam(event: H3Event, key: string) {
  const value = Number(getRouterParam(event, key))
  if (!Number.isFinite(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }
  return value
}

function guessMimeType(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

export default defineEventHandler(async (event) => {
  const collectiveId = getNumericRouteParam(event, 'collectiveId')
  const pageId = getNumericRouteParam(event, 'pageId')
  const rawPath = getRouterParam(event, 'path') ?? ''

  const attachmentPath = decodeAttachmentPath(rawPath)
  if (!isValidAttachmentRelativePath(attachmentPath)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid attachment path' })
  }

  const page = await getPage(event, collectiveId, pageId)
  const file = await readAttachmentFile(event, page, attachmentPath)
  const fileName = attachmentPath.split('/').pop() ?? 'file'

  setHeader(event, 'Content-Type', file.contentType ?? guessMimeType(fileName))
  if (file.etag) {
    setHeader(event, 'ETag', file.etag)
  }
  setHeader(event, 'Cache-Control', 'private, max-age=300')

  return file.buffer
})
