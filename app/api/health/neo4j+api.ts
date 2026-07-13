import { runReadQuery, verifyNeo4jConnection } from "@/lib/neo4j";

type HealthRow = Readonly<{
  ok: number;
  nodeCount: { toNumber: () => number } | number;
  relCount: { toNumber: () => number } | number;
}>;

function toNumber(value: HealthRow["nodeCount"]): number {
  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

export async function GET(): Promise<Response> {
  try {
    await verifyNeo4jConnection();

    const [stats] = await runReadQuery<HealthRow>(`
      RETURN
        1 AS ok,
        count { (n) } AS nodeCount,
        count { ()-[r]->() } AS relCount
    `);

    return Response.json({
      status: "ok",
      database: "neo4j-aura",
      transport: "https-query-api-v2",
      connected: true,
      nodeCount: stats ? toNumber(stats.nodeCount) : 0,
      relCount: stats ? toNumber(stats.relCount) : 0,
      message: "Live Cypher query executed on AuraDB",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AuraDB connection failed";

    return Response.json(
      {
        status: "error",
        database: "neo4j-aura",
        connected: false,
        message,
      },
      { status: 503 },
    );
  }
}
