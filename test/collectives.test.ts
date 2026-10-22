import { describe, expect, it } from "vitest";
import { ref } from "vue";
import {
  buildCollectiveSummary,
  COLLECTIVE_MEMBER_LEVELS,
  COLLECTIVE_PAGE_MODES,
  resolveSiblingCreateParentId,
  slugifyCollectiveName,
  validateCollectiveEmoji,
} from "~~/shared/collectives";
import { useCollectiveSettingsForm } from "../app/composables/useCollectiveSettingsForm";

describe("resolveSiblingCreateParentId", () => {
  it("uses landing page id when parentId is 0", () => {
    expect(resolveSiblingCreateParentId({ id: 42, parentId: 0 })).toBe(42);
  });

  it("uses parent id for nested pages", () => {
    expect(resolveSiblingCreateParentId({ id: 100, parentId: 42 })).toBe(42);
  });
});

describe("validateCollectiveEmoji", () => {
  it("accepts an empty value (no emoji)", () => {
    expect(validateCollectiveEmoji(null)).toEqual({ valid: true });
    expect(validateCollectiveEmoji("")).toEqual({ valid: true });
    expect(validateCollectiveEmoji(undefined)).toEqual({ valid: true });
  });

  it("accepts common pictographic emojis, including ZWJ and variation sequences", () => {
    for (const emoji of ["🐘", "😀", "🌹", "✊", "🚩", "❤️", "👍🏽", "👨‍👩‍👧"]) {
      expect(validateCollectiveEmoji(emoji)).toEqual({ valid: true });
    }
  });

  it("rejects flag and keycap emojis that Nextcloud refuses", () => {
    expect(validateCollectiveEmoji("🇩🇪").valid).toBe(false);
    expect(validateCollectiveEmoji("1️⃣").valid).toBe(false);
    expect(validateCollectiveEmoji("#️⃣").valid).toBe(false);
  });

  it("rejects plain characters and multiple emojis", () => {
    expect(validateCollectiveEmoji("a").valid).toBe(false);
    expect(validateCollectiveEmoji("🐘🐘").valid).toBe(false);
  });
});

describe("slugifyCollectiveName", () => {
  it("slugifies names with spaces and punctuation", () => {
    expect(slugifyCollectiveName(" Mein Collective! ")).toBe("mein-collective");
  });

  it("keeps unicode letters", () => {
    expect(slugifyCollectiveName("Büro Team")).toBe("büro-team");
  });
});

describe("buildCollectiveSummary", () => {
  it("maps Nextcloud fields into a CollectiveSummary", () => {
    expect(
      buildCollectiveSummary(
        {
          id: 7,
          name: "Team Alpha",
          emoji: "🐘",
          canEdit: true,
          circleId: "circle-1",
          level: COLLECTIVE_MEMBER_LEVELS.admin,
          editPermissionLevel: COLLECTIVE_MEMBER_LEVELS.member,
          sharePermissionLevel: COLLECTIVE_MEMBER_LEVELS.moderator,
          pageMode: COLLECTIVE_PAGE_MODES.view,
          canShare: true,
        },
        "/Collectives/Team Alpha",
      ),
    ).toEqual({
      id: 7,
      name: "Team Alpha",
      emoji: "🐘",
      icon: null,
      iconOwnerPageId: null,
      canEdit: true,
      slug: "team-alpha",
      path: "/Collectives/Team Alpha",
      circleId: "circle-1",
      level: COLLECTIVE_MEMBER_LEVELS.admin,
      editPermissionLevel: COLLECTIVE_MEMBER_LEVELS.member,
      sharePermissionLevel: COLLECTIVE_MEMBER_LEVELS.moderator,
      pageMode: COLLECTIVE_PAGE_MODES.view,
      canShare: true,
    });
  });

  it("defaults optional booleans and emoji", () => {
    expect(buildCollectiveSummary({ id: 1, name: "Solo" })).toMatchObject({
      emoji: null,
      icon: null,
      iconOwnerPageId: null,
      canEdit: false,
      slug: "solo",
      path: null,
    });
  });
});

describe("COLLECTIVE_MEMBER_LEVELS / COLLECTIVE_PAGE_MODES", () => {
  it("exposes Circles member levels", () => {
    expect(COLLECTIVE_MEMBER_LEVELS).toEqual({
      member: 1,
      moderator: 4,
      admin: 8,
    });
  });

  it("exposes page modes", () => {
    expect(COLLECTIVE_PAGE_MODES).toEqual({
      edit: 0,
      view: 1,
    });
  });
});

describe("useCollectiveSettingsForm", () => {
  it("prefills fields when the dialog opens", async () => {
    const open = ref(false);

    const collective = ref({
      id: 3,
      name: "Notes",
      slug: "notes",
      emoji: "📝",
      editPermissionLevel: COLLECTIVE_MEMBER_LEVELS.moderator,
      sharePermissionLevel: COLLECTIVE_MEMBER_LEVELS.admin,
      pageMode: COLLECTIVE_PAGE_MODES.view,
    });

    const form = useCollectiveSettingsForm(collective, open);

    open.value = true;
    await Promise.resolve();

    expect(form.name.value).toBe("Notes");
    expect(form.icon.value).toBe("emoji:📝");
    expect(form.editLevel.value).toBe(String(COLLECTIVE_MEMBER_LEVELS.moderator));
    expect(form.shareLevel.value).toBe(String(COLLECTIVE_MEMBER_LEVELS.admin));
    expect(form.pageMode.value).toBe(String(COLLECTIVE_PAGE_MODES.view));
  });

  it("builds an UpdateCollectiveInput payload", () => {
    const open = ref(true);

    const form = useCollectiveSettingsForm(
      {
        id: 3,
        name: "Notes",
        slug: "notes",
      },
      open,
    );

    form.name.value = "Updated";
    form.icon.value = "emoji:✨";
    form.editLevel.value = String(COLLECTIVE_MEMBER_LEVELS.admin);
    form.shareLevel.value = String(COLLECTIVE_MEMBER_LEVELS.member);
    form.pageMode.value = String(COLLECTIVE_PAGE_MODES.edit);

    expect(form.toInput()).toEqual({
      name: "Updated",
      icon: "emoji:✨",
      editLevel: COLLECTIVE_MEMBER_LEVELS.admin,
      shareLevel: COLLECTIVE_MEMBER_LEVELS.member,
      pageMode: COLLECTIVE_PAGE_MODES.edit,
    });
  });

  it("returns null when the name is empty", () => {
    const form = useCollectiveSettingsForm(
      {
        id: 3,
        name: "Notes",
        slug: "notes",
      },
      true,
    );

    form.name.value = "   ";

    expect(form.toInput()).toBeNull();
  });
});
