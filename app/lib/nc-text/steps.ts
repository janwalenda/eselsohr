/**
 * Turn recent awareness messages from other sessions into steps, ported from
 * nextcloud/text (`src/helpers/steps.ts`).
 *
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { COLLABORATOR_DISCONNECT_TIME } from "./SyncService";
import type { CollabSession, Step } from "./types";

export function awarenessSteps(sessions: CollabSession[]): Step[] {
  const lastContactThreshold = Math.floor(Date.now() / 1000) - COLLABORATOR_DISCONNECT_TIME;

  return sessions
    .filter((s) => s.lastContact > lastContactThreshold)
    .filter((s) => Boolean(s.lastAwarenessMessage))
    .map((s) => ({
      data: [s.lastAwarenessMessage as string],
      sessionId: s.id,
      version: 0,
    }));
}
