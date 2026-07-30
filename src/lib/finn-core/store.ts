// Shim: preserves the historic import path. Real store lives at
// ./state/finn-store.ts (Phase 1 Brain Core).
export { useFinnStore } from "./state/finn-store";
export type { PendingCommand } from "./state/finn-store";
