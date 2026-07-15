/**
 * SyncService orchestrates pushing local Yjs steps to the server and applying
 * remote steps. Ported from nextcloud/text (`src/services/SyncService.ts`),
 * adapted to the Eselsohr proxy API (`TextApi`) and a plain connection ref.
 *
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import mitt from 'mitt'
import type { Emitter } from 'mitt'
import type { ShallowRef } from 'vue'
import type { TextApi } from './apis'
import Outbox from './Outbox'
import PollingBackend from './PollingBackend'
import { logger } from './logger'
import { awarenessSteps } from './steps'
import { documentStateToStep } from './yjs'
import type { CollabSession, OpenData, Step, SyncDocument, TextConnection } from './types'

export const IDLE_TIMEOUT = 1440
export const COLLABORATOR_IDLE_TIME = 60
export const COLLABORATOR_DISCONNECT_TIME = 90

export const ERROR_TYPE = {
  SAVE_COLLISION: 0,
  PUSH_FAILURE: 1,
  LOAD_ERROR: 2,
  CONNECTION_FAILED: 3,
  SOURCE_NOT_FOUND: 4,
  PUSH_FORBIDDEN: 5,
} as const

export type ErrorType = (typeof ERROR_TYPE)[keyof typeof ERROR_TYPE]

export type EventTypes = {
  opened: OpenData
  sync: { document?: object, steps: Step[] }
  stateChange: { initialLoading?: boolean, dirty?: boolean }
  error: { type: ErrorType, data?: object }
  change: { sessions: CollabSession[], document: SyncDocument }
  save: object
  idle: void
  close: void
}

interface RequestError {
  response?: { status: number, data?: unknown }
  code?: string
}

export class SyncService {
  api: TextApi
  connection: ShallowRef<TextConnection | undefined>
  version = -1
  pushError = 0
  backend?: PollingBackend
  bus: Emitter<EventTypes> = mitt<EventTypes>()

  #sendIntervalId?: ReturnType<typeof setInterval>
  #outbox = new Outbox()
  #openConnection: () => Promise<OpenData>
  #lastStepPush = Date.now()
  #sending = false

  constructor({
    api,
    connection,
    openConnection,
  }: {
    api: TextApi
    connection: ShallowRef<TextConnection | undefined>
    openConnection: () => Promise<OpenData>
  }) {
    this.api = api
    this.connection = connection
    this.#openConnection = openConnection
  }

  hasActiveConnection(): boolean {
    return Boolean(this.connection.value)
  }

  async open() {
    if (this.hasActiveConnection()) {
      logger.debug('already connected')
      return
    }
    const data = await this.#openConnection().catch(e => this.#emitError(e as RequestError))
    if (!data || !this.connection.value) {
      return
    }
    this.backend = new PollingBackend(this, this.connection.value, data)
    this.bus.emit('opened', data)
  }

  startSync() {
    this.backend?.connect()
  }

  syncUp() {
    this.backend?.resetRefetchTimer()
  }

  #emitError(error: RequestError) {
    const eventData = !error.response || error.code === 'ECONNABORTED'
      ? { type: ERROR_TYPE.CONNECTION_FAILED, data: {} }
      : { type: ERROR_TYPE.LOAD_ERROR, data: error.response }
    this.bus.emit('error', eventData)
  }

  #emitDocumentStateStep(documentState: string, version: number) {
    this.bus.emit('sync', { steps: [documentStateToStep(documentState, version)] })
  }

  sendStep(step: Uint8Array) {
    this.#outbox.storeStep(step)
    this.sendSteps()
  }

  sendRecoveryStep(step: Uint8Array) {
    this.#outbox.setRecoveringSync()
    this.#outbox.storeStep(step)
    this.sendSteps()
  }

  sendSteps() {
    if (this.#sendIntervalId) {
      return
    }
    this.#sendIntervalId = setInterval(() => {
      if (this.connection.value && !this.#sending) {
        this.sendStepsNow().catch(err => logger.error('sendStepsNow failed', err))
      }
    }, 200)
  }

  async sendStepsNow() {
    this.#sending = true
    clearInterval(this.#sendIntervalId)
    this.#sendIntervalId = undefined
    if (this.#outbox.hasUpdate) {
      this.bus.emit('stateChange', { dirty: true })
    }
    if (!this.connection.value) {
      this.#sending = false
      return
    }
    const sendable = this.#outbox.getDataToSend()
    return this.api
      .push(this.connection.value, { version: this.version, ...sendable })
      .then((response) => {
        this.#outbox.clearSentData(sendable)
        const { steps, documentState, version } = response.data
        if (documentState) {
          this.#emitDocumentStateStep(documentState, version)
        }
        this.pushError = 0
        this.#sending = false
        if (steps?.length > 0) {
          this.receiveSteps({ steps })
        }
      })
      .catch((err: RequestError) => {
        this.#sending = false
        this.pushError++
        logger.error('Failed to push the steps to the server', err)
        if (!err.response || err.code === 'ECONNABORTED') {
          this.bus.emit('error', { type: ERROR_TYPE.CONNECTION_FAILED, data: {} })
        }
        else if (err.response.status === 412) {
          this.bus.emit('error', { type: ERROR_TYPE.LOAD_ERROR, data: err.response })
        }
        else if (err.response.status === 403) {
          logger.error('failed to write to document - not allowed')
          this.bus.emit('error', { type: ERROR_TYPE.PUSH_FORBIDDEN, data: {} })
        }
        else {
          this.bus.emit('error', { type: ERROR_TYPE.PUSH_FAILURE, data: {} })
        }
        throw new Error('Failed to apply steps. Retry!', { cause: err })
      })
  }

  receiveSteps({
    steps,
    document,
    sessions = [],
  }: {
    steps: Step[]
    document?: object
    sessions?: CollabSession[]
  }) {
    const versionAfter = Math.max(this.version, ...steps.map(s => s.version))
    this.bus.emit('sync', { steps: [...awarenessSteps(sessions), ...steps], document })
    if (this.version < versionAfter) {
      console.warn(`Failed to process steps leading up to version ${versionAfter}.`)
    }
    this.#lastStepPush = Date.now()
  }

  checkIdle() {
    const lastPushMinutesAgo = (Date.now() - this.#lastStepPush) / 1000 / 60
    if (lastPushMinutesAgo > IDLE_TIMEOUT) {
      this.bus.emit('idle')
      return true
    }
    return false
  }

  async sendRemainingSteps() {
    if (!this.#outbox.hasUpdate) {
      return
    }
    return this.sendStepsNow().catch(err => logger.error('final steps failed', err))
  }

  async close() {
    this.backend?.disconnect()
    if (this.connection.value) {
      await this.api.close(this.connection.value).catch(e => logger.info('Failed to close connection.', e))
    }
    this.connection.value = undefined
    this.bus.emit('close')
  }
}

export default SyncService
