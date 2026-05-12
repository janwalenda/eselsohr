/**
 * HttpProvider bridges a Yjs document to the {@link SyncService}. It merges the
 * roles that nextcloud/text splits across `y-websocket.js` (the modified
 * WebsocketProvider) and `WebSocketPolyfill.ts`: outgoing Yjs/awareness updates
 * are handed to the SyncService outbox, and steps received from the server are
 * decoded and applied to the document, replying when the protocol requires it.
 *
 * SPDX-FileCopyrightText: 2019 Kevin Jahns, 2022 Nextcloud GmbH
 * SPDX-License-Identifier: MIT
 */

import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as Y from 'yjs'
import { decodeArrayBuffer, encodeArrayBuffer } from './base64'
import { logger } from './logger'
import { messageAwareness, messageSync, readMessage } from './protocol'
import type SyncService from './SyncService'
import { stepsFromOpenData } from './yjs'
import type { OpenData, Step } from './types'

export class HttpProvider {
  doc: Y.Doc
  remote: Y.Doc
  awareness: awarenessProtocol.Awareness
  synced = false

  #syncService: SyncService
  #processingVersion = 0
  #onOpened: (data: OpenData) => void
  #onSync: (payload: { steps: Step[] }) => void
  #updateHandler: (update: Uint8Array, origin: unknown) => void
  #awarenessUpdateHandler: () => void

  constructor({
    doc,
    awareness,
    syncService,
  }: {
    doc: Y.Doc
    awareness: awarenessProtocol.Awareness
    syncService: SyncService
  }) {
    this.doc = doc
    this.remote = new Y.Doc()
    this.awareness = awareness
    this.#syncService = syncService

    this.#onOpened = (data: OpenData) => {
      this.#processSteps(stepsFromOpenData(data))
    }
    this.#onSync = ({ steps }) => {
      if (steps) {
        this.#processSteps(steps)
      }
    }
    syncService.bus.on('opened', this.#onOpened)
    syncService.bus.on('sync', this.#onSync)

    this.#updateHandler = (_update, origin) => {
      if (origin === this) {
        return
      }
      const from = Y.encodeStateVector(this.remote)
      const fullUpdate = Y.encodeStateAsUpdate(this.doc, from)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeUpdate(encoder, fullUpdate)
      this.#send(encoding.toUint8Array(encoder))
    }
    this.doc.on('update', this.#updateHandler)

    this.#awarenessUpdateHandler = () => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]),
      )
      this.#send(encoding.toUint8Array(encoder))
    }
    this.awareness.on('update', this.#awarenessUpdateHandler)
  }

  #handleMessage(buf: Uint8Array) {
    const encoder = readMessage(this, buf, true)
    if (encoding.length(encoder) > 1) {
      this.#send(encoding.toUint8Array(encoder))
    }
  }

  #processSteps(steps: Step[]) {
    steps.forEach((step) => {
      this.#processingVersion = step.version
      step.data.forEach((singleStep) => {
        this.#handleMessage(decodeArrayBuffer(singleStep))
      })
      this.#syncService.version = Math.max(this.#syncService.version, this.#processingVersion)
    })
    this.#processingVersion = 0
  }

  #send(step: Uint8Array) {
    const encoded = encodeArrayBuffer(step)
    const isSyncStep1 = encoded < 'AAE'
    if (!this.#processingVersion || !isSyncStep1) {
      this.#syncService.sendStep(step)
      return
    }
    logger.error(`Failed to process step ${this.#processingVersion}.`, {
      lastSuccessfullyProcessed: this.#syncService.version,
    })
    this.#processingVersion = 0
    this.#syncService.sendRecoveryStep(step)
  }

  destroy() {
    this.#syncService.bus.off('opened', this.#onOpened)
    this.#syncService.bus.off('sync', this.#onSync)
    this.doc.off('update', this.#updateHandler)
    this.awareness.off('update', this.#awarenessUpdateHandler)
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], 'provider destroyed')
  }
}
