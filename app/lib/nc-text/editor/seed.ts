/**
 * Seed an empty Yjs document from markdown, ported from nextcloud/text's
 * `setInitialYjsState`. Resetting the base doc's clientID to 0 makes the initial
 * state deterministic across clients, so the first editor to open an unsaved page
 * produces the same Yjs state the Text web UI would, avoiding divergence.
 *
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { prosemirrorToYXmlFragment } from "y-prosemirror";
import { Doc, XmlFragment, applyUpdate, encodeStateAsUpdate } from "yjs";
import { markdownToProseMirrorNode } from "./apply-markdown";

export function seedInitialContent(ydoc: Doc, content: string) {
  if (!content?.trim()) {
    return;
  }

  const node = markdownToProseMirrorNode(content);

  const baseDoc = new Doc();

  // Idempotent initial state requires a fixed clientID (see Text PR #5589).
  baseDoc.clientID = 0;
  const fragment = baseDoc.get("default", XmlFragment) as XmlFragment;

  if (!fragment.doc) {
    return;
  }

  prosemirrorToYXmlFragment(node, fragment);

  applyUpdate(ydoc, encodeStateAsUpdate(baseDoc));
}
