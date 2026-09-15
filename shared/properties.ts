export type PropertyType = "text" | "list" | "number" | "checkbox" | "date" | "datetime" | "tags";

export type PropertyValue = string | number | boolean | string[] | null;

export type PageProperties = Record<string, PropertyValue>;

export type PropertyDefinition = {
  key: string;
  type: PropertyType;
  value: PropertyValue;
};

export type EditablePropertyDefinition = PropertyDefinition & {
  id: string;
};

const DEFAULT_PROPERTY_TYPES: Record<string, PropertyType> = {
  tags: "tags",
  tag: "tags",
  aliases: "list",
  alias: "list",
  cssclasses: "list",
  cssclass: "list",
  icon: "text",
};

/** Keys managed by dedicated UI (not shown as generic property rows). */
export const HIDDEN_PROPERTY_KEYS = new Set(["icon"]);

export function isHiddenPropertyKey(key: string) {
  return HIDDEN_PROPERTY_KEYS.has(key.trim().toLowerCase());
}

export function inferPropertyType(key: string, value: PropertyValue): PropertyType {
  const normalizedKey = key.trim().toLowerCase();

  if (normalizedKey in DEFAULT_PROPERTY_TYPES) {
    return DEFAULT_PROPERTY_TYPES[normalizedKey]!;
  }

  if (Array.isArray(value)) {
    return "list";
  }

  if (typeof value === "boolean") {
    return "checkbox";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return "datetime";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return "date";
    }
  }

  return "text";
}

export function shouldInferTypeFromKey(key: string): boolean {
  return key.trim().toLowerCase() in DEFAULT_PROPERTY_TYPES;
}

export function propertyDefinitionsFromRecord(properties: PageProperties): PropertyDefinition[] {
  return Object.entries(properties)
    .filter(([key]) => !isHiddenPropertyKey(key))
    .map(([key, value]) => ({
      key,
      type: inferPropertyType(key, value),
      value,
    }));
}

export function recordFromPropertyDefinitions(definitions: PropertyDefinition[]): PageProperties {
  const record: PageProperties = {};

  for (const definition of definitions) {
    const key = definition.key.trim();

    if (!key) {
      continue;
    }

    record[key] = definition.value;
  }

  return record;
}

export function normalizePropertyKey(key: string) {
  return key.trim();
}
