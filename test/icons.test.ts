import { describe, expect, it } from "vitest";
import {
  iconFromEmoji,
  iconFromProperties,
  isValidLucideName,
  parseIcon,
  serializeIcon,
} from "../shared/icons";

describe("parseIcon / serializeIcon", () => {
  it("parses prefixed icon values", () => {
    expect(parseIcon("emoji:🇩🇪")).toEqual({ kind: "emoji", value: "🇩🇪" });
    expect(parseIcon("lucide:folder-open")).toEqual({ kind: "lucide", value: "folder-open" });
    expect(parseIcon("image:.attachments.12/icon.webp")).toEqual({
      kind: "image",
      value: ".attachments.12/icon.webp",
    });
  });

  it("treats bare values as emoji (Nextcloud back-compat)", () => {
    expect(parseIcon("🐘")).toEqual({ kind: "emoji", value: "🐘" });
    expect(iconFromEmoji("🐘")).toBe("emoji:🐘");
    expect(iconFromEmoji(null)).toBeNull();
  });

  it("round-trips via serializeIcon", () => {
    const descriptor = { kind: "lucide" as const, value: "star" };

    expect(parseIcon(serializeIcon(descriptor))).toEqual(descriptor);
  });

  it("returns null for empty values", () => {
    expect(parseIcon(null)).toBeNull();
    expect(parseIcon("")).toBeNull();
    expect(parseIcon("   ")).toBeNull();
  });
});

describe("isValidLucideName", () => {
  it("accepts kebab-case names", () => {
    expect(isValidLucideName("folder-open")).toBe(true);
    expect(isValidLucideName("file-text")).toBe(true);
  });

  it("rejects invalid names", () => {
    expect(isValidLucideName("FolderOpen")).toBe(false);
    expect(isValidLucideName("folder_open")).toBe(false);
    expect(isValidLucideName("../etc")).toBe(false);
  });
});

describe("iconFromProperties", () => {
  it("reads and normalizes the icon property", () => {
    expect(iconFromProperties({ icon: "lucide:home" })).toBe("lucide:home");
    expect(iconFromProperties({ icon: "🏠" })).toBe("emoji:🏠");
    expect(iconFromProperties({})).toBeNull();
    expect(iconFromProperties({ icon: 12 })).toBeNull();
  });
});
