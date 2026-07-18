import type { Component } from "vue";
import { isValidLucideName } from "~~/shared/icons";

const iconCache = new Map<string, Component>();

/** Vite-resolvable lazy loaders (bare `import(\`lucide-vue-next/…\`)` fails at runtime). */
const lucideLoaders = import.meta.glob<{ default?: Component }>(
  "../../node_modules/lucide-vue-next/dist/esm/icons/*.js",
);

const loadersByName = new Map<string, () => Promise<{ default?: Component }>>();

for (const [path, loader] of Object.entries(lucideLoaders)) {
  const fileName = path.slice(path.lastIndexOf("/") + 1, -".js".length);

  if (fileName) {
    loadersByName.set(fileName, loader);
  }
}

/**
 * Dynamically load a single Lucide icon by kebab-case name.
 * Uses per-file imports so unused icons stay out of the bundle.
 */
export async function loadLucideIcon(name: string): Promise<Component | null> {
  const normalized = name.trim().toLowerCase();

  if (!isValidLucideName(normalized)) {
    return null;
  }

  const cached = iconCache.get(normalized);

  if (cached) {
    return cached;
  }

  const loader = loadersByName.get(normalized);

  if (!loader) {
    return null;
  }

  try {
    const mod = await loader();
    const component = mod.default ?? null;

    if (!component) {
      return null;
    }

    iconCache.set(normalized, component);
    return component;
  } catch {
    return null;
  }
}

/** Curated Lucide names shown in the icon picker (searchable subset). */
export const LUCIDE_PICKER_NAMES = [
  "folder",
  "folder-open",
  "file-text",
  "file",
  "book",
  "book-open",
  "bookmark",
  "star",
  "heart",
  "home",
  "users",
  "user",
  "settings",
  "search",
  "tag",
  "tags",
  "calendar",
  "clock",
  "check",
  "circle-check",
  "alert-circle",
  "info",
  "lightbulb",
  "flame",
  "zap",
  "rocket",
  "target",
  "flag",
  "map",
  "map-pin",
  "globe",
  "link",
  "paperclip",
  "image",
  "camera",
  "music",
  "video",
  "mic",
  "message-square",
  "mail",
  "phone",
  "briefcase",
  "building",
  "building-2",
  "store",
  "shopping-cart",
  "credit-card",
  "wallet",
  "chart-bar",
  "chart-line",
  "trending-up",
  "pie-chart",
  "layers",
  "layout-grid",
  "layout-list",
  "kanban",
  "list",
  "list-checks",
  "clipboard",
  "clipboard-list",
  "pen",
  "pencil",
  "edit",
  "code",
  "code-2",
  "terminal",
  "database",
  "server",
  "cloud",
  "wifi",
  "lock",
  "key",
  "shield",
  "eye",
  "eye-off",
  "bell",
  "inbox",
  "archive",
  "trash-2",
  "download",
  "upload",
  "share",
  "share-2",
  "external-link",
  "git-branch",
  "git-commit",
  "github",
  "box",
  "package",
  "puzzle",
  "wrench",
  "hammer",
  "tool",
  "cog",
  "sliders-horizontal",
  "filter",
  "funnel",
  "compass",
  "navigation",
  "plane",
  "car",
  "bike",
  "ship",
  "train",
  "coffee",
  "utensils",
  "apple",
  "leaf",
  "tree-pine",
  "flower-2",
  "sun",
  "moon",
  "cloud-sun",
  "umbrella",
  "droplet",
  "waves",
  "mountain",
  "palmtree",
  "cat",
  "dog",
  "bird",
  "fish",
  "bug",
  "brain",
  "graduation-cap",
  "school",
  "library",
  "newspaper",
  "megaphone",
  "trophy",
  "medal",
  "award",
  "gift",
  "party-popper",
  "smile",
  "laugh",
  "frown",
  "thumbs-up",
  "thumbs-down",
  "hand",
  "handshake",
  "sparkles",
  "wand-sparkles",
  "palette",
  "brush",
  "paintbrush",
  "camera",
  "film",
  "clapperboard",
  "headphones",
  "radio",
  "podcast",
  "printer",
  "scan",
  "qr-code",
  "barcode",
  "hash",
  "at-sign",
  "percent",
  "infinity",
  "activity",
  "pulse",
  "heart-pulse",
  "stethoscope",
  "pill",
  "syringe",
  "ambulance",
  "hospital",
] as const;
