import neo4j, { type Driver, type QueryResult, type RecordShape } from "neo4j-driver";

type Neo4jConfig = Readonly<{
  uri: string;
  username: string;
  password: string;
  database: string;
}>;

let driver: Driver | null = null;

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

  return { uri, username, password, database };
}

export function getNeo4jDriver(): Driver {
  if (!driver) {
    const config = getNeo4jConfig();
    driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password),
    );
  }

  return driver;
}

export async function verifyNeo4jConnection(): Promise<void> {
  const activeDriver = getNeo4jDriver();
  await activeDriver.verifyConnectivity();
}

export async function runReadQuery<T extends RecordShape = RecordShape>(
  query: string,
  parameters: Record<string, unknown> = {},
): Promise<T[]> {
  const { database } = getNeo4jConfig();
  const session = getNeo4jDriver().session({ database });

  try {
    const result: QueryResult = await session.executeRead((tx) =>
      tx.run(query, parameters),
    );

    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}

export async function runWriteQuery<T extends RecordShape = RecordShape>(
  query: string,
  parameters: Record<string, unknown> = {},
): Promise<T[]> {
  const { database } = getNeo4jConfig();
  const session = getNeo4jDriver().session({ database });

  try {
    const result: QueryResult = await session.executeWrite((tx) =>
      tx.run(query, parameters),
    );

    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
