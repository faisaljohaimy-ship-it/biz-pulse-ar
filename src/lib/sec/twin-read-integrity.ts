/** A successful subset must never turn a failed twin snapshot into live telemetry. */
const SOURCES = [
  "sections",
  "circles",
  "sites",
  "buildings",
  "cameras",
  "gates",
  "sensors",
  "controlRooms",
  "patrolTeams",
] as const;

type TwinReadSource = (typeof SOURCES)[number];

export function assertTwinReadsSucceeded(reads: Record<TwinReadSource, unknown>): void {
  for (const source of SOURCES) {
    const fail = (): never => {
      // Deliberately omit database errors, credentials, IDs and row contents.
      throw new Error(`twin-read-unavailable:${source}`);
    };
    const value = reads[source];
    if (!value || typeof value !== "object" || Array.isArray(value)) fail();
    const result = value as {
      data?: unknown;
      error?: unknown;
      status?: unknown;
      count?: unknown;
    };
    if (result.error != null || !Array.isArray(result.data)) fail();
    const rows = result.data as unknown[];
    if (
      result.status !== undefined &&
      (typeof result.status !== "number" ||
        !Number.isInteger(result.status) ||
        result.status < 200 ||
        result.status >= 300)
    ) {
      fail();
    }
    // When a total was supplied, do not bless a truncated page as a complete
    // snapshot. Missing count remains unknown, NOT evidence of completeness.
    if (
      result.count != null &&
      (typeof result.count !== "number" ||
        !Number.isInteger(result.count) ||
        result.count < 0 ||
        result.count !== rows.length)
    ) {
      fail();
    }
    const ids = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) fail();
      const id = (row as { id?: unknown }).id;
      if (typeof id !== "string" || !id.trim() || ids.has(id)) fail();
      ids.add(id as string);
    }
  }
}
