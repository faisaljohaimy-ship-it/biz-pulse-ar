// Telemetry emitter — narrow interface for shipping conversation events
// to an external sink. Sink is injected; no hard dependency on any
// concrete transport.
import type { ConversationAuditEntry } from "./audit.server";
import type { ConversationMetricsSnapshot } from "./metrics.server";

export type TelemetrySink = (payload: {
  kind: "audit" | "metrics";
  entry?: ConversationAuditEntry;
  metrics?: ConversationMetricsSnapshot;
}) => void | Promise<void>;

export class ConversationTelemetry {
  private sinks = new Set<TelemetrySink>();

  register(sink: TelemetrySink): () => void {
    this.sinks.add(sink);
    return () => {
      this.sinks.delete(sink);
    };
  }

  async emitAudit(entry: ConversationAuditEntry): Promise<void> {
    for (const s of this.sinks) {
      try {
        await s({ kind: "audit", entry });
      } catch {
        /* isolated */
      }
    }
  }

  async emitMetrics(metrics: ConversationMetricsSnapshot): Promise<void> {
    for (const s of this.sinks) {
      try {
        await s({ kind: "metrics", metrics });
      } catch {
        /* isolated */
      }
    }
  }
}
