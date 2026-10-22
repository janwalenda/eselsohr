/**
 * Yjs <-> sync-protocol helpers, ported from nextcloud/text (`src/helpers/yjs.ts`).
 * These convert the server's base64 `documentState`/steps into the y-protocols
 * sync messages our provider understands, and back.
 *
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";
import { decodeArrayBuffer, encodeArrayBuffer } from "./base64";
import { messageSync } from "./protocol";
import type { OpenData, Step } from "./types";

export function getDocumentState(ydoc: Y.Doc): string {
  return encodeArrayBuffer(Y.encodeStateAsUpdate(ydoc));
}

export function applyDocumentState(ydoc: Y.Doc, documentState: string, origin: object) {
  Y.applyUpdate(ydoc, decodeArrayBuffer(documentState), origin);
}

export function stepsFromOpenData(data: OpenData): Step[] {
  if (!data.documentState) {
    return [];
  }

  return [documentStateToStep(data.documentState, data.document.lastSavedVersion)];
}

export function documentStateToStep(documentState: string, version: number): Step {
  return {
    data: [encodeArrayBuffer(documentStateToUpdateMessage(documentState))],
    sessionId: 0,
    version,
  };
}

function documentStateToUpdateMessage(documentState: string): Uint8Array {
  const update = decodeArrayBuffer(documentState);

  const encoder = encoding.createEncoder();

  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

export function applyStep(ydoc: Y.Doc, step: Step, origin: unknown = "origin") {
  for (const encoded of step.data) {
    const decoder = decoding.createDecoder(decodeArrayBuffer(encoded));

    const messageType = decoding.readVarUint(decoder);

    if (messageType !== messageSync) {
      console.error("y.js update message with invalid type", messageType);
      return;
    }

    const encoder = encoding.createEncoder();

    syncProtocol.readSyncMessage(decoder, encoder, ydoc, origin);
  }
}
