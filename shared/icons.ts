export type IconKind = "emoji" | "lucide" | "image";

export type IconDescriptor = {
  kind: IconKind;
  value: string;
};

const ICON_PREFIXES: IconKind[] = ["emoji", "lucide", "image"];

const LUCIDE_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Parse a frontmatter `icon` value into a typed descriptor.
 * Accepts prefixed forms (`emoji:…`, `lucide:…`, `image:…`) and bare emoji
 * strings for convenience / migration from Nextcloud's emoji field.
 */
export function parseIcon(raw: string | null | undefined): IconDescriptor | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  const colonIndex = trimmed.indexOf(":");

  if (colonIndex > 0) {
    const prefix = trimmed.slice(0, colonIndex).toLowerCase();

    const value = trimmed.slice(colonIndex + 1).trim();

    if (ICON_PREFIXES.includes(prefix as IconKind) && value) {
      return { kind: prefix as IconKind, value };
    }
  }

  // Bare value: treat as emoji (back-compat with Nextcloud collective.emoji).
  return { kind: "emoji", value: trimmed };
}

export function serializeIcon(descriptor: IconDescriptor): string {
  return `${descriptor.kind}:${descriptor.value}`;
}

/** Convert a Nextcloud collective emoji into an icon string, if present. */
export function iconFromEmoji(emoji: string | null | undefined): string | null {
  const parsed = parseIcon(emoji);

  if (!parsed || parsed.kind !== "emoji") {
    return null;
  }

  return serializeIcon(parsed);
}

export function isValidLucideName(name: string): boolean {
  return LUCIDE_NAME_RE.test(name.trim());
}

/** Extract the raw icon string from page properties (frontmatter). */
export function iconFromProperties(
  properties: Record<string, unknown> | null | undefined,
): string | null {
  if (!properties) {
    return null;
  }

  const raw = properties.icon;

  if (typeof raw !== "string") {
    return null;
  }

  const parsed = parseIcon(raw);

  return parsed ? serializeIcon(parsed) : null;
}
