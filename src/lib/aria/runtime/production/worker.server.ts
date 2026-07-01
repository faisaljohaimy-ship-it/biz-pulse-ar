/**
 * Phase 10.1 — Worker registry.
 */
import { validateWorker } from "./contracts";
import type { WorkerDescriptor } from "./types";
import type { RuntimeStateStore } from "./state.server";

export class WorkerRegistry {
  constructor(
    private readonly store: RuntimeStateStore,
    private readonly maxWorkers: number,
  ) {}

  register(input: unknown): WorkerDescriptor {
    const worker = validateWorker(input);
    if (this.store.listWorkers().length >= this.maxWorkers) {
      throw new Error(
        `Worker cap reached (${this.maxWorkers}); cannot register ${worker.id}`,
      );
    }
    this.store.registerWorker(worker);
    return worker;
  }

  unregister(id: string): void {
    this.store.removeWorker(id);
  }

  list(): ReadonlyArray<WorkerDescriptor> {
    return this.store.listWorkers();
  }
}
