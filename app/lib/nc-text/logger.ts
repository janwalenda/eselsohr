/**
 * Minimal logger for the Text sync layer. Mirrors the small surface of
 * `@nextcloud/logger` used by nextcloud/text so ported modules stay close to the
 * original. Debug output is gated behind a flag to keep the console quiet.
 */

const DEBUG = false

function format(message: string) {
  return `[nc-text] ${message}`
}

export const logger = {
  debug(message: string, context?: unknown) {
    if (DEBUG) {
      console.debug(format(message), context ?? '')
    }
  },
  info(message: string, context?: unknown) {
    console.info(format(message), context ?? '')
  },
  warn(message: string, context?: unknown) {
    console.warn(format(message), context ?? '')
  },
  error(message: string, context?: unknown) {
    console.error(format(message), context ?? '')
  },
}
