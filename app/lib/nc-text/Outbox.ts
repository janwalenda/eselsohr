/**
 * Outbox buffers the latest sync update, sync query and awareness update before
 * they are pushed to the server. Ported verbatim from nextcloud/text
 * (`src/services/Outbox.ts`); the base64-prefix classification is what lets the
 * server tell the three message kinds apart, so it must not change.
 *
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { encodeArrayBuffer } from "./base64";
import { logger } from "./logger";

export interface Sendable {
  steps: string[];
  awareness: string;
  recoveryAttempt?: number;
}

export default class Outbox {
  #awarenessUpdate = "";
  #syncUpdate = "";
  #syncQuery = "";
  #recoveryAttemptCounter = 0;
  #isRecoveringSync = false;

  storeStep(step: Uint8Array) {
    const encoded = encodeArrayBuffer(step);

    if (encoded < "AAA" || encoded > "Ag") {
      logger.warn("Unexpected step type:", { step, encoded });
      return;
    }

    if (encoded < "AAE") {
      this.#syncQuery = encoded;
      return;
    }

    if (encoded < "AQ") {
      this.#syncUpdate = encoded;
      return;
    }

    this.#awarenessUpdate = encoded;
  }

  setRecoveringSync() {
    this.#isRecoveringSync = true;
    this.#recoveryAttemptCounter++;
  }

  getDataToSend(): Sendable {
    return {
      steps: [this.#syncUpdate, this.#syncQuery].filter((s) => s),
      awareness: this.#awarenessUpdate,
      ...this.recoveryData,
    };
  }

  get recoveryData(): { recoveryAttempt?: number } {
    return this.#isRecoveringSync ? { recoveryAttempt: this.#recoveryAttemptCounter } : {};
  }

  get hasUpdate(): boolean {
    return !!this.#syncUpdate;
  }

  clearSentData({ steps, awareness }: Sendable) {
    if (steps.includes(this.#syncUpdate)) {
      this.#syncUpdate = "";
    }

    if (steps.includes(this.#syncQuery)) {
      this.#syncQuery = "";
      this.#isRecoveringSync = false;
    }

    if (this.#awarenessUpdate === awareness) {
      this.#awarenessUpdate = "";
    }
  }
}
