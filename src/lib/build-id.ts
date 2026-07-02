// Build stamp — evaluated once when the module first loads.
// Kept simple and dependency-free so it's stable per deployed bundle.
export const BUILD_ID: string = new Date().toISOString().slice(0, 10);
