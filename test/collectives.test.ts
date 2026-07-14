import { describe, expect, it } from "vitest";
import { resolveSiblingCreateParentId } from "~~/shared/collectives";

describe("resolveSiblingCreateParentId", () => {
  it("uses landing page id when parentId is 0", () => {
    expect(resolveSiblingCreateParentId({ id: 42, parentId: 0 })).toBe(42);
  });

  it("uses parent id for nested pages", () => {
    expect(resolveSiblingCreateParentId({ id: 100, parentId: 42 })).toBe(42);
  });
});
