export function shouldApplySourceMarkdownOnModeSwitch(sourceRemoteStale: boolean) {
  return !sourceRemoteStale;
}

/**
 * Close an unclosed fenced code block (``` / ~~~) so markdown-it keeps the
 * fence as a code block instead of leaving a dangling opener that later
 * round-trips into inline code / broken prose.
 */
export function ensureClosedFencedCodeBlocks(markdown: string): string {
  const lines = markdown.split("\n");
  let openFence: string | null = null;

  for (const line of lines) {
    const match = /^(```+|~~~+)(.*)$/.exec(line);

    if (!match) {
      continue;
    }

    const marker = match[1];
    const info = match[2] ?? "";

    if (!openFence) {
      openFence = marker;
      continue;
    }

    const sameChar = marker[0] === openFence[0];
    const longEnough = marker.length >= openFence.length;
    const emptyInfo = info.trim() === "";

    if (sameChar && longEnough && emptyInfo) {
      openFence = null;
    }
  }

  if (!openFence) {
    return markdown;
  }

  const trimmedEnd = markdown.replace(/\s*$/, "");
  const suffix = trimmedEnd.length === 0 || trimmedEnd.endsWith("\n") ? "" : "\n";

  return `${trimmedEnd}${suffix}${openFence}\n`;
}
