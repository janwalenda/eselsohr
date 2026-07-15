import type { H3Event } from 'h3'
import { getActiveSession } from './nc-session'

export type NcCredentials = {
  ncUrl: string
  loginName: string
  appPassword: string
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function normalizeNcUrl(rawUrl: string): string {
  const value = rawUrl.trim()
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: 'Nextcloud URL is required' })
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(withProtocol)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Nextcloud URL' })
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'Nextcloud URL must use http or https' })
  }
  if (!url.hostname) {
    throw createError({ statusCode: 400, statusMessage: 'Nextcloud URL must include a host' })
  }
  if (url.username || url.password) {
    throw createError({ statusCode: 400, statusMessage: 'Nextcloud URL must not include credentials' })
  }
  if (url.protocol === 'http:' && !isLocalHostname(url.hostname)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only localhost Nextcloud instances may use http',
    })
  }

  url.hash = ''
  url.search = ''
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString().replace(/\/$/, '')
}

function joinNcUrl(baseUrl: string, path: string) {
  const normalizedBase = `${baseUrl}/`
  const normalizedPath = path.replace(/^\/+/, '')
  return new URL(normalizedPath, normalizedBase).toString()
}

function getBasicAuthHeader(credentials: NcCredentials) {
  const token = Buffer.from(`${credentials.loginName}:${credentials.appPassword}`).toString('base64')
  return `Basic ${token}`
}

export function createNcConnectivityError(targetUrl: string, error: unknown) {
  const host = new URL(targetUrl).host
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : null
  const message = error instanceof Error ? error.message : String(error)

  let statusMessage = `The Nextcloud server ${host} could not be reached`
  if (code === 'ENOTFOUND') {
    statusMessage = `The Nextcloud server ${host} could not be resolved`
  }
  else if (code === 'ECONNREFUSED') {
    statusMessage = `The Nextcloud server ${host} refused the connection`
  }
  else if (message.includes('Connect Timeout Error')) {
    statusMessage = `The Nextcloud server ${host} timed out`
  }

  return createError({
    statusCode: 502,
    statusMessage,
    data: {
      host,
      code,
      message,
    },
  })
}

async function parseResponseBody(response: Response): Promise<JsonValue | string | null> {
  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as JsonValue
  }
  catch {
    return text
  }
}

function readOcsErrorMessage(body: JsonValue | string | null): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }

  const message = (body as { ocs?: { meta?: { message?: string } } }).ocs?.meta?.message
  return message?.trim() || null
}

async function withNcError(response: Response) {
  const body = await parseResponseBody(response)
  const ocsMessage = readOcsErrorMessage(body)
  const statusMessage = ocsMessage
    ?? (typeof body === 'string' && body.trim() ? body.trim().slice(0, 500) : null)
    ?? response.statusText
    ?? 'Nextcloud request failed'

  // #region agent log
  fetch('http://127.0.0.1:7441/ingest/295730c0-36a3-4a8b-b23d-14de7325db37',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ac45ab'},body:JSON.stringify({sessionId:'ac45ab',runId:'native-parity',hypothesisId:'M1,M2,M3',location:'nc-api.ts:withNcError',message:'nc request failed',data:{url:response.url,status:response.status,statusMessage,bodyPreview:typeof body==='string'?body.slice(0,300):JSON.stringify(body).slice(0,300)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  throw createError({
    statusCode: response.status,
    statusMessage,
    data: body,
  })
}

export async function ncFetchWithCredentials(
  credentials: NcCredentials,
  path: string,
  init: RequestInit = {},
) {
  const targetUrl = joinNcUrl(credentials.ncUrl, path)
  let response: Response
  try {
    response = await fetch(targetUrl, {
      ...init,
      headers: {
        Authorization: getBasicAuthHeader(credentials),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
        ...init.headers,
      },
    })
  }
  catch (error) {
    throw createNcConnectivityError(targetUrl, error)
  }

  return response
}

export async function ncFetch(event: H3Event, path: string, init: RequestInit = {}) {
  const session = await getActiveSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'No active Nextcloud session' })
  }

  return ncFetchWithCredentials(session, path, init)
}

export async function ncFetchJsonWithCredentials<T = unknown>(
  credentials: NcCredentials,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await ncFetchWithCredentials(credentials, path, init)
  if (!response.ok) {
    await withNcError(response)
  }
  return await parseResponseBody(response) as T
}

export async function ncFetchJson<T = unknown>(
  event: H3Event,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await ncFetch(event, path, init)
  if (!response.ok) {
    await withNcError(response)
  }
  return await parseResponseBody(response) as T
}

export async function hasCollectivesCapability(credentials: NcCredentials) {
  const json = await ncFetchJsonWithCredentials<{
    ocs?: {
      data?: {
        capabilities?: {
          collectives?: unknown
          circles?: {
            teamResourceProviders?: unknown
          }
        } & Record<string, unknown>
      }
    }
  }>(credentials, '/ocs/v2.php/cloud/capabilities?format=json')

  const capabilities = json.ocs?.data?.capabilities
  if (capabilities?.collectives) {
    return true
  }

  const teamResourceProviders = capabilities?.circles?.teamResourceProviders
  if (Array.isArray(teamResourceProviders) && teamResourceProviders.includes('collectives')) {
    return true
  }

  return false
}

export async function revokeAppPassword(credentials: NcCredentials) {
  try {
    await ncFetchJsonWithCredentials(credentials, '/ocs/v2.php/core/apppassword', {
      method: 'DELETE',
    })
  }
  catch {
    // Best-effort cleanup; local session removal still has to proceed.
  }
}
