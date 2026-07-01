/**
 * Phase 8.5 — Live execution monitor. Subscribes to the Task Bus event
 * stream and translates bus events into execution progress updates and
 * lifecycle events. Purely event-driven, no polling.
 */
import { subscribeBus } from "../task-bus";
import type { BusEvent } from "../task-bus";
import { computeProgress } from "./progress.server";
import { emitExecutionEvent } from "./events";
import { getSession } from "./session.server";

/**
 * Attach a monitor to a specific (session, mission) pair. Returns an
 * unsubscribe function; the Director calls it when the mission ends.
 */
export function attachMonitor(sessionId: string, missionId: string): () => void {
  return subscribeBus((evt: BusEvent) => {
    if (evt.missionId !== missionId) return;
    switch (evt.name) {
      case "TaskStarted":
        emitExecutionEvent("TaskStarted", sessionId, missionId, evt.detail);
        computeProgress(sessionId, missionId);
        break;
      case "TaskCompleted":
        emitExecutionEvent("TaskCompleted", sessionId, missionId, evt.detail);
        computeProgress(sessionId, missionId);
        break;
      case "TaskFailed":
      case "TaskTimedOut":
        emitExecutionEvent("TaskFailed", sessionId, missionId, evt.detail);
        computeProgress(sessionId, missionId);
        // Bump retry counter when the bus schedules a retry.
        break;
      case "TaskRetried": {
        emitExecutionEvent("RetryScheduled", sessionId, missionId, evt.detail);
        const s = getSession(sessionId);
        if (s) s.metrics.retry_count += 1;
        break;
      }
      case "MissionProgressUpdated":
        computeProgress(sessionId, missionId);
        break;
      case "TaskCancelled":
        computeProgress(sessionId, missionId);
        break;
      default:
        break;
    }
  });
}
