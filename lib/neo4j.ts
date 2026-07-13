/**
 * Neo4j access for Expo API routes (EAS Hosting / Cloudflare Workers).
 * Uses Aura HTTPS Query API — Bolt TCP does not work on Workers.
 * Local Node scripts may still use neo4j-driver directly.
 */

type Neo4jConfig = Readonly<{
  uri: string;
  username: string;
  password: string;
  database: string;
  httpHost: string;
}>;

export type RecordShape = Record<string, unknown>;

type QueryApiResponse = Readonly<{
  data?: Readonly<{
    fields: string[];
    values: unknown[][];
  }>;
  errors?: ReadonlyArray<Readonly<{ message?: string; code?: string }>>;
}>;

/** Minimal tx surface used by graph helpers (e.g. community votes). */
export type ManagedTransaction = Readonly<{
  run: (
    query: string,
    parameters?: Record<string, unknown>,
  ) => Promise<{
    records: Array<{
      get: (key: string) => unknown;
      toObject: () => RecordShape;
    }>;
  }>;
}>;

export function getNeo4jConfig(): Neo4jConfig {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE ?? "neo4j";

  if (!uri || !password) {
    throw new Error(
      "Missing NEO4J_URI or NEO4J_PASSWORD. Add Aura credentials to .env (see .env.example).",
    );
  }

  if (!uri.startsWith("neo4j+s://")) {
    throw new Error(
      "Acharya requires Neo4j AuraDB (URI must start with neo4j+s://). Local bolt:// is not allowed for production data.",
    );
  }

  const httpHost = uri.replace(/^neo4j\+s:\/\//u, "").replace(/\/$/u, "");

  return { uri, username, password, database, httpHost };
}

function authHeader(username: string, password: string): string {
  const token = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function rowsToRecords(
  fields: string[],
  values: unknown[][],
): Array<{ get: (key: string) => unknown; toObject: () => RecordShape }> {
  return values.map((row) => {
    const obj: RecordShape = {};
    fields.forEach((field, index) => {
      obj[field] = row[index];
    });

    return {
      get: (key: string) => obj[key],
      toObject: () => ({ ...obj }),
    };
  });
}

function normalizeParameters(
  parameters: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(parameters)) {
    if (
      typeof value === "object" &&
      value !== null &&
      "toNumber" in value &&
      typeof (value as { toNumber: () => number }).toNumber === "function"
    ) {
      normalized[key] = (value as { toNumber: () => number }).toNumber();
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

async function executeQueryApi(
  query: string,
  parameters: Record<string, unknown> = {},
): Promise<Array<{ get: (key: string) => unknown; toObject: () => RecordShape }>> {
  const { username, password, database, httpHost } = getNeo4jConfig();
  const url = `https://${httpHost}/db/${encodeURIComponent(database)}/query/v2`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(username, password),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      statement: query,
      parameters: normalizeParameters(parameters),
    }),
  });

  const payload = (await response.json().catch(() => null)) as QueryApiResponse | null;

  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.message ??
      `Neo4j Query API failed (${response.status})`;
    throw new Error(message);
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? "Neo4j Query API error");
  }

  const fields = payload?.data?.fields ?? [];
  const values = payload?.data?.values ?? [];
  return rowsToRecords(fields, values);
}

export async function verifyNeo4jConnection(): Promise<void> {
  const rows = await executeQueryApi("RETURN 1 AS ok");
  if (!rows[0] || rows[0].get("ok") !== 1) {
    throw new Error("Neo4j connectivity check failed");
  }
}

export async function runReadQuery<T extends RecordShape = RecordShape>(
  query: string,
  parameters: Record<string, unknown> = {},
): Promise<T[]> {
  const records = await executeQueryApi(query, parameters);
  return records.map((record) => record.toObject() as T);
}

export async function runWriteQuery<T extends RecordShape = RecordShape>(
  query: string,
  parameters: Record<string, unknown> = {},
): Promise<T[]> {
  const records = await executeQueryApi(query, parameters);
  return records.map((record) => record.toObject() as T);
}

export async function runInWriteTransaction<T>(
  fn: (tx: ManagedTransaction) => Promise<T>,
): Promise<T> {
  const tx: ManagedTransaction = {
    run: async (query, parameters = {}) => {
      const records = await executeQueryApi(query, parameters);
      return { records };
    },
  };

  return fn(tx);
}

/** @deprecated Bolt driver is not used on EAS Hosting — kept for script compatibility no-ops. */
export function getNeo4jDriver(): never {
  throw new Error(
    "Bolt neo4j-driver is not available in API routes. Use runReadQuery/runWriteQuery (HTTPS Query API).",
  );
}

export async function closeNeo4jDriver(): Promise<void> {
  // No persistent connection for HTTPS Query API.
}
