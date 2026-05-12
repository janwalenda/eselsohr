import { describe, expect, it } from 'vitest'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as Y from 'yjs'
import Outbox from '../app/lib/nc-text/Outbox'
import { encodeArrayBuffer } from '../app/lib/nc-text/base64'
import { messageAwareness, messageSync } from '../app/lib/nc-text/protocol'
import { applyStep, documentStateToStep, getDocumentState } from '../app/lib/nc-text/yjs'

function syncUpdateMessage(doc: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeUpdate(encoder, Y.encodeStateAsUpdate(doc))
  return encoding.toUint8Array(encoder)
}

function awarenessMessage(doc: Y.Doc): Uint8Array {
  const awareness = new awarenessProtocol.Awareness(doc)
  awareness.setLocalStateField('user', { name: 'Tester' })
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageAwareness)
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, [doc.clientID]),
  )
  return encoding.toUint8Array(encoder)
}

describe('Outbox', () => {
  it('classifies a sync update as a pending step', () => {
    const doc = new Y.Doc()
    doc.getMap('m').set('k', 'v')
    const outbox = new Outbox()
    const message = syncUpdateMessage(doc)

    outbox.storeStep(message)

    expect(outbox.hasUpdate).toBe(true)
    expect(outbox.getDataToSend().steps).toContain(encodeArrayBuffer(message))
  })

  it('classifies an awareness update separately from sync steps', () => {
    const doc = new Y.Doc()
    const outbox = new Outbox()
    const message = awarenessMessage(doc)

    outbox.storeStep(message)

    expect(outbox.hasUpdate).toBe(false)
    expect(outbox.getDataToSend().awareness).toBe(encodeArrayBuffer(message))
  })

  it('clears only the data that was actually sent', () => {
    const doc = new Y.Doc()
    doc.getArray('a').push([1])
    const outbox = new Outbox()
    const message = syncUpdateMessage(doc)
    outbox.storeStep(message)

    const sendable = outbox.getDataToSend()
    outbox.clearSentData(sendable)

    expect(outbox.hasUpdate).toBe(false)
  })
})

describe('yjs document state round-trip', () => {
  it('reconstructs document content from a base64 document state step', () => {
    const source = new Y.Doc()
    source.getMap('meta').set('title', 'Hello collab')
    source.getArray('items').push(['a', 'b', 'c'])

    const step = documentStateToStep(getDocumentState(source), 0)

    const target = new Y.Doc()
    applyStep(target, step)

    expect(target.getMap('meta').get('title')).toBe('Hello collab')
    expect(target.getArray('items').toJSON()).toEqual(['a', 'b', 'c'])
  })
})
