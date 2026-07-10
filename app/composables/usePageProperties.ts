import type { MaybeRefOrGetter } from "vue";
import { ref, toValue, watch } from "vue";
import {
  inferPropertyType,
  propertyDefinitionsFromRecord,
  recordFromPropertyDefinitions,
  shouldInferTypeFromKey,
  type EditablePropertyDefinition,
  type PropertyDefinition,
  type PropertyType,
  type PageProperties,
} from "~~/shared/properties";

function createPropertyRow(
  definition: PropertyDefinition,
  id = crypto.randomUUID(),
): EditablePropertyDefinition {
  return { ...definition, id };
}

function rowsFromRecord(properties: PageProperties): EditablePropertyDefinition[] {
  return propertyDefinitionsFromRecord(properties).map((definition) => createPropertyRow(definition));
}

function mergeExternalRows(
  existing: EditablePropertyDefinition[],
  properties: PageProperties,
): EditablePropertyDefinition[] {
  const incoming = propertyDefinitionsFromRecord(properties);
  const drafts = existing.filter((definition) => !definition.key.trim());
  const existingByKey = new Map(
    existing
      .filter((definition) => definition.key.trim())
      .map((definition) => [definition.key.trim(), definition]),
  );

  const merged = incoming.map((definition) => {
    const previous = existingByKey.get(definition.key.trim());

    return previous
      ? { ...definition, id: previous.id }
      : createPropertyRow(definition);
  });

  return [...merged, ...drafts];
}

function resolvePropertyType(
  current: PropertyDefinition,
  patch: Partial<PropertyDefinition>,
  merged: PropertyDefinition,
): PropertyType {
  if (patch.type !== undefined) {
    return patch.type;
  }

  if (patch.key !== undefined && !shouldInferTypeFromKey(merged.key)) {
    return current.type;
  }

  return inferPropertyType(merged.key, merged.value);
}

export function usePageProperties(
  pageState: {
    properties: MaybeRefOrGetter<PageProperties>;
    setProperties: (properties: PageProperties) => void;
  },
  pageKey: MaybeRefOrGetter<string>,
  options?: {
    onCommit?: () => void;
  },
) {
  const definitions = ref<EditablePropertyDefinition[]>([]);
  let skipNextPropertiesSync = false;

  watch(
    () => toValue(pageKey),
    () => {
      definitions.value = rowsFromRecord(toValue(pageState.properties) ?? {});
    },
    { immediate: true },
  );

  watch(
    () => toValue(pageState.properties),
    (properties) => {
      if (skipNextPropertiesSync) {
        skipNextPropertiesSync = false;
        return;
      }

      definitions.value = mergeExternalRows(definitions.value, properties ?? {});
    },
    { deep: true },
  );

  function commit(next: EditablePropertyDefinition[]) {
    skipNextPropertiesSync = true;
    definitions.value = next;
    pageState.setProperties(recordFromPropertyDefinitions(next));
    options?.onCommit?.();
  }

  function addProperty(key = "", type: PropertyType = "text") {
    const emptyValue =
      type === "list" || type === "tags"
        ? []
        : type === "checkbox"
          ? false
          : type === "number"
            ? 0
            : "";

    commit([
      ...definitions.value,
      createPropertyRow({
        key,
        type,
        value: emptyValue,
      }),
    ]);
  }

  function updateProperty(index: number, patch: Partial<PropertyDefinition>) {
    const next = [...definitions.value];

    const current = next[index];

    if (!current) {
      return;
    }

    const merged = { ...current, ...patch };

    const nextType = patch.type ?? merged.type;

    if (patch.type && patch.type !== current.type && patch.value === undefined) {
      merged.value =
        nextType === "list" || nextType === "tags"
          ? []
          : nextType === "checkbox"
            ? false
            : nextType === "number"
              ? 0
              : "";
    }

    merged.type = resolvePropertyType(current, patch, merged);

    next[index] = merged;
    commit(next);
  }

  function removeProperty(index: number) {
    commit(definitions.value.filter((_, currentIndex) => currentIndex !== index));
  }

  return {
    definitions,
    addProperty,
    updateProperty,
    removeProperty,
  };
}
