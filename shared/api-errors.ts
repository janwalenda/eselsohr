type OcsMeta = {
  statuscode?: number
  message?: string
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
