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
    const value = reads[source];
    if (!value || typeof value !== "object") {
      throw new Error(`twin-read-unavailable:${source}`);
    }
    const result = value as { data?: unknown; error?: unknown; status?: unknown };
    if (
      result.error != null ||
      !Array.isArray(result.data) ||
      (typeof result.status === "number" && result.status >= 400)
    ) {
      // Deliberately omit raw database errors, credentials and row contents.
      throw new Error(`twin-read-unavailable:${source}`);
    }
  }
}
