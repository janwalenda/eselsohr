/**
 * Image node that resolves Collectives attachment paths to the Eselsohr proxy at
 * render time only. The stored `src` attribute stays a relative `.attachments.*`
 * path so the shared Yjs document remains compatible with the Nextcloud Text/
 * Collectives clients; only the displayed `<img>` uses the authenticated proxy URL.
 */

import Image from '@tiptap/extension-image'
import {
  buildAttachmentProxyBase,
  encodeAttachmentPath,
  isValidAttachmentRelativePath,
} from '~~/shared/collective-attachments'

export function resolveDisplaySrc(src: string, collectiveId: number, pageId: number) {
  if (!src || /^(https?:|data:|blob:)/i.test(src)) {
    return src
  }
  const normalized = src.replace(/^\.\//, '')
  if (collectiveId && pageId && isValidAttachmentRelativePath(normalized)) {
    return `${buildAttachmentProxyBase(collectiveId, pageId)}/${encodeAttachmentPath(normalized)}`
  }
  return src
}

export const ResolvedImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      collectiveId: 0,
      pageId: 0,
    }
  },

  addNodeView() {
    return ({ node }) => {
      const { collectiveId, pageId } = this.options as { collectiveId: number, pageId: number }
      const img = document.createElement('img')
      img.src = resolveDisplaySrc(node.attrs.src as string, collectiveId, pageId)
      if (node.attrs.alt) {
        img.alt = node.attrs.alt as string
      }
      if (node.attrs.title) {
        img.title = node.attrs.title as string
      }
      return { dom: img }
    }
  },
})

export default ResolvedImage
