/**
 * Textarea helpers for inserting markdown syntax from the formatting toolbar
 * while in source edit mode.
 */

function getLineRange(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEndIndex = value.indexOf('\n', end)
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
  return { lineStart, lineEnd }
}

function replaceRange(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number,
  replacement: string,
  selectionStart?: number,
  selectionEnd?: number,
) {
  const value = textarea.value
  textarea.value = value.slice(0, start) + replacement + value.slice(end)
  const nextStart = selectionStart ?? start + replacement.length
  const nextEnd = selectionEnd ?? nextStart
  textarea.focus()
  textarea.setSelectionRange(nextStart, nextEnd)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

export function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string = before) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const selected = value.slice(start, end)
  const insertion = `${before}${selected}${after}`
  const cursorStart = start + before.length
  const cursorEnd = selected ? cursorStart + selected.length : cursorStart
  replaceRange(textarea, start, end, insertion, cursorStart, cursorEnd)
}

export function insertAtCursor(textarea: HTMLTextAreaElement, text: string) {
  const { selectionStart: start, selectionEnd: end } = textarea
  replaceRange(textarea, start, end, text, start + text.length, start + text.length)
}

export function prefixLines(textarea: HTMLTextAreaElement, prefix: string) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const { lineStart, lineEnd } = getLineRange(value, start, end)
  const block = value.slice(lineStart, lineEnd)
  const prefixed = block.split('\n').map(line => `${prefix}${line}`).join('\n')
  replaceRange(textarea, lineStart, lineEnd, prefixed, lineStart, lineStart + prefixed.length)
}

export function toggleLinePrefix(textarea: HTMLTextAreaElement, prefix: string) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const { lineStart, lineEnd } = getLineRange(value, start, end)
  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const allPrefixed = lines.every(line => line.startsWith(prefix))
  const next = lines
    .map(line => (allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`))
    .join('\n')
  replaceRange(textarea, lineStart, lineEnd, next, lineStart, lineStart + next.length)
}

export function toggleHeading(textarea: HTMLTextAreaElement, level: 1 | 2 | 3) {
  toggleLinePrefix(textarea, '#'.repeat(level) + ' ')
}

export function toggleBulletList(textarea: HTMLTextAreaElement) {
  toggleLinePrefix(textarea, '- ')
}

export function toggleOrderedList(textarea: HTMLTextAreaElement) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const { lineStart, lineEnd } = getLineRange(value, start, end)
  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const orderedPattern = /^\d+\.\s/
  const allOrdered = lines.every(line => orderedPattern.test(line))
  const next = lines
    .map((line, index) => {
      if (allOrdered) {
        return line.replace(orderedPattern, '')
      }
      return `${index + 1}. ${line}`
    })
    .join('\n')
  replaceRange(textarea, lineStart, lineEnd, next, lineStart, lineStart + next.length)
}

export function toggleTaskList(textarea: HTMLTextAreaElement) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const { lineStart, lineEnd } = getLineRange(value, start, end)
  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const taskPattern = /^- \[[ x]\]\s/
  const allTasks = lines.every(line => taskPattern.test(line))
  const next = lines
    .map((line) => {
      if (allTasks) {
        return line.replace(taskPattern, '- ')
      }
      if (line.startsWith('- ')) {
        return line.replace(/^- /, '- [ ] ')
      }
      return `- [ ] ${line}`
    })
    .join('\n')
  replaceRange(textarea, lineStart, lineEnd, next, lineStart, lineStart + next.length)
}

export function toggleBlockquote(textarea: HTMLTextAreaElement) {
  toggleLinePrefix(textarea, '> ')
}

export function toggleCodeBlock(textarea: HTMLTextAreaElement) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const selected = value.slice(start, end)
  if (selected.includes('\n')) {
    wrapSelection(textarea, '```\n', '\n```')
    return
  }
  const fenced = `\`\`\`\n${selected}\n\`\`\``
  replaceRange(textarea, start, end, fenced, start + 4, start + 4 + selected.length)
}

export function insertLink(textarea: HTMLTextAreaElement, href: string) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const selected = value.slice(start, end) || 'Linktext'
  const insertion = `[${selected}](${href})`
  replaceRange(textarea, start, end, insertion, start + 1, start + 1 + selected.length)
}

export function insertImage(textarea: HTMLTextAreaElement, src: string, alt = 'Bild') {
  insertAtCursor(textarea, `![${alt}](${src})`)
}

export function insertTable(textarea: HTMLTextAreaElement) {
  insertAtCursor(textarea, '\n| Spalte 1 | Spalte 2 | Spalte 3 |\n| --- | --- | --- |\n|  |  |  |\n')
}
