/**
 * Base64 encoding/decoding for ArrayBuffers, ported from nextcloud/text
 * (`src/helpers/base64.ts`). Uses lib0/buffer which ships with Yjs.
 *
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { fromBase64, toBase64 } from 'lib0/buffer'

export function encodeArrayBuffer(data: Uint8Array): string {
  return toBase64(new Uint8Array(data))
}

export function decodeArrayBuffer(encoded: string): Uint8Array {
  return fromBase64(encoded)
}
