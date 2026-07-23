// Shim: preserves the historic import path. Real store lives at
// ./state/aria-store.ts (Phase 1 Brain Core).
export { useFinnStore } from "./state/aria-store";
export type { PendingCommand } from "./state/aria-store";
