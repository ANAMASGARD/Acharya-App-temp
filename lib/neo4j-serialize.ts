type Neo4jInteger = Readonly<{
  toNumber: () => number;
}>;

type Neo4jDateTime = Readonly<{
  toString: () => string;
}>;

function isNeo4jInteger(value: unknown): value is Neo4jInteger {
  return (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as Neo4jInteger).toNumber === "function"
  );
}

function isNeo4jDateTime(value: unknown): value is Neo4jDateTime {
  return (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    "year" in value &&
    typeof (value as Neo4jDateTime).toString === "function"
  );
}

export function serializeNeo4jValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serializeNeo4jValue);
  }

  if (isNeo4jInteger(value)) {
    return value.toNumber();
  }

  if (isNeo4jDateTime(value)) {
    return value.toString();
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const serialized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(record)) {
      serialized[key] = serializeNeo4jValue(nestedValue);
    }

    return serialized;
  }

  return value;
}
