import type { H3Event } from 'h3'
import type {
  TextOpenData,
  TextSessionAction,
} from '../../shared/text-session'
import { ncFetch } from './nc-api'

/**
 * Client for the Nextcloud Text collaborative editing API (`/apps/text/session/*`).
 *
 * Auth is the active Eselsohr session's Nextcloud app password (Basic auth via
 * `ncFetch`). App-password requests bypass Nextcloud's CSRF check, so no
 * requesttoken is needed. Status codes that carry meaningful bodies (409 outside
 * change, 412 expired session, 403 read-only) are passed through to the browser
 * instead of being turned into errors.
 */

const TEXT_BASE = '/index.php/apps/text'

type JsonObject = Record<string, unknown>

function textHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  }
  catch {
    return text
  }
}

/**
 * Open (or rejoin) the editing session for a file. Maps to
 * `PUT /apps/text/session/{fileId}/create`.
 */
export async function createTextSession(
  event: H3Event,
  params: { fileId: number, filePath: string, baseVersionEtag?: string | null },
): Promise<TextOpenData> {
  const response = await ncFetch(event, `${TEXT_BASE}/session/${params.fileId}/create`, {
    method: 'PUT',
    headers: textHeaders(),
    body: JSON.stringify({
      fileId: params.fileId,
      filePath: params.filePath,
      baseVersionEtag: params.baseVersionEtag ?? undefined,
    }),
  })

  const body = await parseJson(response)
  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: extractError(body) ?? 'Failed to open Text editing session',
      data: body,
    })
  }

  return body as TextOpenData
}

/**
 * Forward a session action (`push`/`sync`/`save`/`close`/`mention`) to Nextcloud.
 * Returns the raw status so the handler can pass through 409/412/403 verbatim.
 */
export async function forwardTextSession(
  event: H3Event,
  action: TextSessionAction,
  documentId: number,
  payload: JsonObject,
): Promise<{ status: number, body: unknown }> {
  const verb = action === 'mention' ? 'PUT' : 'POST'
  const response = await ncFetch(event, `${TEXT_BASE}/session/${documentId}/${action}`, {
    method: verb,
    headers: textHeaders(),
    body: JSON.stringify(payload),
  })

  return {
    status: response.status,
    body: await parseJson(response),
  }
}

/**
 * Read the client payload, forward it to Nextcloud Text and mirror the upstream
 * status code (so 409 outside-change / 412 expired reach the SyncService intact).
 */
export async function proxyTextSessionAction(event: H3Event, action: TextSessionAction) {
  const payload = await readBody<JsonObject>(event)
  const documentId = Number(payload?.documentId)
  if (!Number.isFinite(documentId)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing documentId in request body' })
  }

  const { status, body } = await forwardTextSession(event, action, documentId, payload)
  setResponseStatus(event, status)
  return body
}

function extractError(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'error' in body) {
    const value = (body as { error?: unknown }).error
    if (typeof value === 'string') {
      return value
    }
  }
  return undefined
}
