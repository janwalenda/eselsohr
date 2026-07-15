/**
 * PollingBackend periodically fetches remote steps via `sync`. Ported from
 * nextcloud/text (`src/services/PollingBackend.ts`); the notify_push/HPB fast path
 * is intentionally omitted here and tracked as the optional Phase 5 work, so this
 * always uses adaptive HTTP polling.
 *
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ERROR_TYPE } from './SyncService'
import type SyncService from './SyncService'
import { logger } from './logger'
import type { CollabSession, OpenData, Step, SyncDocument, TextConnection } from './types'

const FETCH_INTERVAL = 300
const FETCH_INTERVAL_MAX = 5000
const FETCH_INTERVAL_SINGLE_EDITOR = 5000
const FETCH_INTERVAL_READ_ONLY = 30000
const FETCH_INTERVAL_INVISIBLE = 20000
const MAX_RETRY_FETCH_COUNT = 5
const COLLABORATOR_DISCONNECT_TIME = FETCH_INTERVAL_INVISIBLE * 1.5

interface PollData {
  document: SyncDocument
  sessions: CollabSession[]
  steps: Step[]
}

interface ConflictData extends PollData {
  outsideChange: string
}

export default class PollingBackend {
  #syncService: SyncService
  #connection: TextConnection
  #readOnly: boolean
  #lastPoll = 0
  #fetchInterval = FETCH_INTERVAL
  #fetchRetryCounter = 0
  fetcher: ReturnType<typeof setInterval> | undefined
  #pollActive = false
  #initialLoadingFinished = false

  visibilitychange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.#fetchInterval = FETCH_INTERVAL_INVISIBLE
    }
    else {
      this.resetRefetchTimer()
    }
  }

  constructor(syncService: SyncService, connection: TextConnection, { readOnly }: OpenData) {
    this.#syncService = syncService
    this.#connection = connection
    this.#readOnly = readOnly
  }

  connect() {
    if (this.fetcher) {
      console.error('Trying to connect, but already connected')
      return
    }
    this.#initialLoadingFinished = false
    this.fetcher = setInterval(this._fetchSteps.bind(this), 50)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilitychange)
    }
  }

  async _fetchSteps() {
    if (this.#pollActive) {
      return
    }
    const now = Date.now()
    if (this.#lastPoll > now - this.#fetchInterval) {
      return
    }
    if (!this.fetcher) {
      console.error('No interval but triggered')
      return
    }
    this.#pollActive = true
    await this.#syncService.api
      .sync(this.#connection, { version: this.#syncService.version })
      .then(this._handleResponse.bind(this), this._handleError.bind(this))
    this.#lastPoll = Date.now()
    this.#pollActive = false
  }

  _handleResponse({ data }: { data: PollData }) {
    const { document, sessions } = data
    this.#fetchRetryCounter = 0

    this.#syncService.bus.emit('change', { document, sessions })
    this.#syncService.receiveSteps(data)

    if (data.steps.length === 0) {
      if (!this.#initialLoadingFinished) {
        this.#initialLoadingFinished = true
      }
      if (this.#syncService.checkIdle()) {
        return
      }
      const disconnect = Date.now() - COLLABORATOR_DISCONNECT_TIME
      const alive = sessions.filter(s => s.lastContact * 1000 > disconnect)
      if (this.#readOnly) {
        this.maximumReadOnlyTimer()
      }
      else if (alive.length < 2) {
        this.maximumRefetchTimer()
      }
      else {
        this.increaseRefetchTimer()
      }
      this.#syncService.bus.emit('stateChange', { initialLoading: true })
      return
    }

    if (this.#initialLoadingFinished) {
      this.resetRefetchTimer()
    }
  }

  _handleError(e: { response?: { status: number, data: ConflictData }, code?: string }) {
    if (!e.response || e.code === 'ECONNABORTED') {
      if (this.#fetchRetryCounter++ >= MAX_RETRY_FETCH_COUNT) {
        this.increaseRefetchTimer()
        this.#syncService.bus.emit('error', { type: ERROR_TYPE.CONNECTION_FAILED, data: {} })
      }
    }
    else if (e.response.status === 409) {
      // Still apply the steps to update our version of the document.
      this._handleResponse(e.response)
      logger.error('Conflict during file save, please resolve')
      this.#syncService.bus.emit('error', {
        type: ERROR_TYPE.SAVE_COLLISION,
        data: { outsideChange: e.response.data.outsideChange },
      })
    }
    else if (e.response.status === 412) {
      this.#syncService.bus.emit('error', { type: ERROR_TYPE.LOAD_ERROR, data: e.response })
      this.disconnect()
    }
    else if ([403, 404].includes(e.response.status)) {
      this.#syncService.bus.emit('error', { type: ERROR_TYPE.SOURCE_NOT_FOUND, data: {} })
      this.disconnect()
    }
    else if ([502, 503].includes(e.response.status)) {
      this.increaseRefetchTimer()
      this.#syncService.bus.emit('error', { type: ERROR_TYPE.CONNECTION_FAILED, data: {} })
    }
    else {
      this.disconnect()
      this.#syncService.bus.emit('error', { type: ERROR_TYPE.CONNECTION_FAILED, data: {} })
    }
  }

  disconnect() {
    clearInterval(this.fetcher)
    this.fetcher = undefined
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilitychange)
    }
  }

  resetRefetchTimer() {
    this.#fetchInterval = FETCH_INTERVAL
  }

  increaseRefetchTimer() {
    this.#fetchInterval = Math.min(this.#fetchInterval * 2, FETCH_INTERVAL_MAX)
  }

  maximumRefetchTimer() {
    this.#fetchInterval = FETCH_INTERVAL_SINGLE_EDITOR
  }

  maximumReadOnlyTimer() {
    this.#fetchInterval = FETCH_INTERVAL_READ_ONLY
  }
}
