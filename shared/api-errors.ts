export const COLLECTIVES_WRITE_AUTH_ERROR_CODE = 'COLLECTIVES_WRITE_AUTH_FAILED'

type OcsMeta = {
  statuscode?: number
  message?: string
}

export function readOcsStatusCode(data: unknown, depth = 0): number | null {
  if (!data || depth > 4) {
    return null
  }

  if (typeof data === 'string') {
    try {
      return readOcsStatusCode(JSON.parse(data), depth + 1)
    }
    catch {
      return null
    }
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return null
  }

  const record = data as {
    code?: string
    ocs?: { meta?: OcsMeta }
    data?: unknown
  }

  if (record.code === COLLECTIVES_WRITE_AUTH_ERROR_CODE) {
    return 996
  }

  const statusCode = record.ocs?.meta?.statuscode
  if (typeof statusCode === 'number') {
    return statusCode
  }

  if (record.data) {
    return readOcsStatusCode(record.data, depth + 1)
  }

  return null
}

export function isCollectivesWriteAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const statusCode = 'statusCode' in error
    ? Number((error as { statusCode?: number }).statusCode)
    : null
  if (statusCode !== 500) {
    return false
  }

  const data = 'data' in error ? (error as { data?: unknown }).data : null
  return readOcsStatusCode(data) === 996
}

function readOcsMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const record = data as {
    ocs?: { meta?: OcsMeta }
    data?: unknown
    statusMessage?: string
  }

  const ocs = record.ocs?.meta
  if (ocs?.message?.trim() && ocs.message.trim() !== 'Internal Server Error') {
    return ocs.message.trim()
  }

  if (record.data) {
    const nested = readOcsMessage(record.data)
    if (nested) {
      return nested
    }
  }

  if (ocs?.statuscode === 996) {
    return 'Nextcloud Collectives meldet einen Serverfehler (996). Bitte die Nextcloud-Logs prüfen.'
  }

  const statusMessage = record.statusMessage
  return statusMessage ?? null
}

export function extractApiErrorMessage(error: unknown, fallback = 'Die Aktion konnte nicht abgeschlossen werden.'): string {
  if (typeof error === 'object' && error && 'data' in error) {
    const fromData = readOcsMessage((error as { data?: unknown }).data)
    if (fromData && fromData !== 'Internal Server Error') {
      return fromData
    }
  }

  if (typeof error === 'object' && error && 'statusMessage' in error) {
    const statusMessage = String((error as { statusMessage?: string }).statusMessage)
    if (statusMessage && statusMessage !== 'Internal Server Error') {
      return statusMessage
    }
  }

  if (error instanceof Error && error.message && !error.message.startsWith('[POST]')) {
    return error.message
  }

  return fallback
}
