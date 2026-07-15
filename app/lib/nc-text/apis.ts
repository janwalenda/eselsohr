/**
 * Client API for the Eselsohr Text-session proxy. Mirrors the request shape of
 * nextcloud/text's `src/apis/{connect,sync,save}.ts`, but targets our own
 * `/api/collectives/{id}/pages/{id}/text-session/*` routes (which inject the
 * Nextcloud app password server-side). Responses are normalized to an axios-like
 * `{ data, status }` / thrown `{ response }` shape so the ported SyncService and
 * PollingBackend keep working without modification.
 */

import type {
  TextClosePayload,
  TextConnection,
  TextOpenData,
  TextPushResponse,
  TextSaveResponse,
  TextSyncResponse,
} from '~~/shared/text-session'

export interface AxiosLike<T> {
  data: T
  status: number
}

export interface PushArgs {
  version: number
  steps: string[]
  awareness: string
  recoveryAttempt?: number
}

export interface SaveArgs {
  version: number
  autosaveContent: string
  documentState: string
  force?: boolean
  manualSave?: boolean
}

function basePath(collectiveId: number, pageId: number) {
  return `/api/collectives/${collectiveId}/pages/${pageId}/text-session`
}

export function createTextApi(collectiveId: number, pageId: number) {
  const apiFetch = useApiFetch()
  const root = basePath(collectiveId, pageId)

  async function request<T>(action: string, body: Record<string, unknown>): Promise<AxiosLike<T>> {
    let response
    try {
      response = await apiFetch.raw<T>(`${root}/${action}`, {
        method: 'POST',
        body,
        ignoreResponseError: true,
      })
    }
    catch (cause) {
      // No HTTP response at all (offline, DNS, abort).
      throw { code: 'ECONNABORTED', cause }
    }

    const data = response._data as T
    if (response.status >= 200 && response.status < 300) {
      return { data, status: response.status }
    }
    throw { response: { status: response.status, data } }
  }

  return {
    async open(): Promise<TextOpenData> {
      const { data } = await request<TextOpenData>('create', {})
      return data
    },

    push(connection: TextConnection, data: PushArgs) {
      return request<TextPushResponse>('push', {
        ...connection,
        version: data.version,
        steps: data.steps.filter(Boolean),
        awareness: data.awareness,
        recoveryAttempt: data.recoveryAttempt,
      })
    },

    sync(connection: TextConnection, data: { version: number }) {
      return request<TextSyncResponse>('sync', {
        ...connection,
        version: data.version,
      })
    },

    save(connection: TextConnection, data: SaveArgs) {
      return request<TextSaveResponse>('save', {
        ...connection,
        version: data.version,
        autosaveContent: data.autosaveContent,
        documentState: data.documentState,
        force: data.force ?? false,
        manualSave: data.manualSave ?? false,
      })
    },

    close(connection: TextConnection) {
      const payload: TextClosePayload = {
        documentId: connection.documentId,
        sessionId: connection.sessionId,
        sessionToken: connection.sessionToken,
      }
      return request<unknown>('close', { ...payload })
    },
  }
}

export type TextApi = ReturnType<typeof createTextApi>
