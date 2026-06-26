/**
 * Canonical API layer barrel.
 *
 * Server functions should depend on this module instead of duplicating
 * fetch wrappers, ad-hoc Zod usage, or error shapes.
 */

export { ApiError, apiError, isApiError, toApiErrorShape } from "./errors";
export type { ApiErrorCode, ApiErrorShape } from "./errors";
export { input, output, emptyInput, z } from "./validate";
// http.server.ts is intentionally not re-exported here to avoid pulling
// server-only code into client bundles via the barrel. Import it directly:
//   import { httpFetch, httpJson } from "@/lib/api/http.server";
