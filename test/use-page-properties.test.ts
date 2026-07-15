import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { usePageProperties } from "../app/composables/usePageProperties";

describe("usePageProperties", () => {
  it("keeps draft rows with empty keys when adding a property", () => {
    const properties = ref<Record<string, string | string[]>>({});

    const { definitions, addProperty } = usePageProperties(
      {
        properties,
        setProperties: (next) => {
          properties.value = next;
        },
      },
      "1:2",
    );

    addProperty();

    expect(definitions.value).toHaveLength(1);
    expect(definitions.value[0]?.key).toBe("");
    expect(properties.value).toEqual({});
  });

  it("persists properties once a key is set", () => {
    const properties = ref<Record<string, string | string[]>>({});

    const { definitions, addProperty, updateProperty } = usePageProperties(
      {
        properties,
        setProperties: (next) => {
          properties.value = next;
        },
      },
      "1:2",
    );

    addProperty();
    updateProperty(0, { key: "tags", value: ["journal"], type: "tags" });

    expect(definitions.value[0]).toMatchObject({
      key: "tags",
      type: "tags",
      value: ["journal"],
    });
    expect(properties.value).toEqual({ tags: ["journal"] });
  });
});
