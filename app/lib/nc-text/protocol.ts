/**
 * Yjs sync + awareness message protocol, distilled from nextcloud/text's inlined
 * `y-websocket.js` (originally MIT, Kevin Jahns). Instead of faking a WebSocket we
 * expose `readMessage` directly so `HttpProvider` can apply incoming steps and
 * compute replies (e.g. answer a SyncStep1 with SyncStep2).
 *
 * SPDX-FileCopyrightText: 2019 Kevin Jahns
 * SPDX-License-Identifier: MIT
 */

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import type * as Y from "yjs";

export const messageSync = 0;
export const messageAwareness = 1;
export const messageAuth = 2;
export const messageQueryAwareness = 3;

export interface MessageProvider {
  doc: Y.Doc;
  remote: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  synced: boolean;
}

type MessageHandler = (
  encoder: encoding.Encoder,
  decoder: decoding.Decoder,
  provider: MessageProvider,
  emitSynced: boolean,
) => void;

const messageHandlers: MessageHandler[] = [];

messageHandlers[messageSync] = (encoder, decoder, provider, emitSynced) => {
  encoding.writeVarUint(encoder, messageSync);
  const decoderForRemote = decoding.clone(decoder);

  const pendingStructsBefore = provider.doc.store.pendingStructs;

  const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, provider.doc, provider);

  if (!pendingStructsBefore && provider.doc.store.pendingStructs && !encoder.hasContent) {
    // The received message left pending structs behind; request a resync.
    console.error("Failed to integrate yjs message. Trying to resync.");
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, provider.doc);
  }

  if (!emitSynced) {
    return;
  }

  if (
    syncMessageType === syncProtocol.messageYjsSyncStep2 ||
    syncMessageType === syncProtocol.messageYjsUpdate
  ) {
    syncProtocol.readSyncMessage(
      decoderForRemote,
      encoding.createEncoder(),
      provider.remote,
      provider,
    );
  }

  if (syncMessageType === syncProtocol.messageYjsSyncStep2 && !provider.synced) {
    provider.synced = true;
  }
};

messageHandlers[messageQueryAwareness] = (encoder, _decoder, provider) => {
  encoding.writeVarUint(encoder, messageAwareness);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(provider.awareness, [provider.doc.clientID]),
  );
};

messageHandlers[messageAwareness] = (_encoder, decoder, provider) => {
  awarenessProtocol.applyAwarenessUpdate(
    provider.awareness,
    decoding.readVarUint8Array(decoder),
    provider,
  );
};

messageHandlers[messageAuth] = () => {
  // Auth messages are not used over the HTTP transport.
};

/**
 * Decode a binary protocol message and apply it to the provider's document.
 * Returns an encoder holding any reply that should be sent back to the server.
 */
export function readMessage(
  provider: MessageProvider,
  buf: Uint8Array,
  emitSynced: boolean,
): encoding.Encoder {
  const decoder = decoding.createDecoder(buf);

  const encoder = encoding.createEncoder();

  const messageType = decoding.readVarUint(decoder);

  const handler = messageHandlers[messageType];

  if (handler) {
    handler(encoder, decoder, provider, emitSynced);
  } else {
    console.error("Unable to compute message");
  }

  return encoder;
}
