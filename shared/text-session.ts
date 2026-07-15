/**
 * Shared types for the Nextcloud Text collaborative editing session API.
 *
 * These mirror the payloads exchanged with `/apps/text/session/*` (see
 * nextcloud/text `lib/Service/ApiService.php` and `src/apis/*`). Eselsohr proxies
 * these calls so the browser never sees the Nextcloud app password.
 */

export type TextDocument = {
  id: number
  lastSavedVersion: number
  lastSavedVersionTime: number
  baseVersionEtag: string
  initialVersion?: number
}

export type TextSessionUser = {
  id: number
  userId?: string
  guestName?: string
  color?: string
  displayName?: string
  lastContact?: number
  documentId?: number
}

export type TextStep = {
  data: string[]
  version: number
  sessionId: number
}

/** Response of `PUT /session/{fileId}/create`, augmented with the file path. */
export type TextOpenData = {
  document: TextDocument
  session: TextSessionUser & { token: string }
  readOnly: boolean
  content?: string | null
  documentState?: string | null
  lock?: unknown
  hasOwner?: boolean
  /** Added by the Eselsohr proxy; the WebDAV-relative path of the page file. */
  filePath?: string
}

/** Connection handle the browser keeps after `create` and sends with every call. */
export type TextConnection = {
  documentId: number
  sessionId: number
  sessionToken: string
  baseVersionEtag: string
  filePath: string
}

export type TextPushPayload = TextConnection & {
  version: number
  steps: string[]
  awareness: string
  recoveryAttempt?: number
}

export type TextPushResponse = {
  steps: TextStep[]
  documentState?: string
  version: number
}

export type TextSyncPayload = TextConnection & {
  version: number
}

export type TextSyncResponse = {
  steps: TextStep[]
  sessions: TextSessionUser[]
  document: TextDocument
  /** Present (with HTTP 409) when the file changed outside the session. */
  outsideChange?: string
}

export type TextSavePayload = TextConnection & {
  version: number
  autosaveContent: string
  documentState: string
  force?: boolean
  manualSave?: boolean
}

export type TextSaveResponse = {
  document?: TextDocument
  outsideChange?: string
}

export type TextClosePayload = Pick<TextConnection, 'documentId' | 'sessionId' | 'sessionToken'>

export type TextSessionAction = 'push' | 'sync' | 'save' | 'close' | 'mention'
