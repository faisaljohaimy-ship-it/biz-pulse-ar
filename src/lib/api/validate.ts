/**
 * Centralised input/output validation helpers built on Zod.
 * Use these from every `createServerFn` to enforce a consistent
 * `validation_failed` envelope instead of raw `ZodError` throws.
 */

import { z, type ZodError, type ZodTypeAny, type input as ZInput, type output as ZOutput } from "zod";

import { apiError } from "./errors";

function formatIssues(err: ZodError): Record<string, unknown> {
  return {
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      code: i.code,
      message: i.message,
    })),
  };
}

/** Wraps a Zod schema as a `createServerFn` `.inputValidator`. */
export function input<S extends ZodTypeAny>(schema: S) {
  return (raw: unknown): ZOutput<S> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw apiError("validation_failed", "Invalid request input", {
        details: formatIssues(parsed.error),
      });
    }
    return parsed.data;
  };
}

/** Validate the handler's return value against a schema before sending it. */
export function output<S extends ZodTypeAny>(schema: S, value: ZInput<S>): ZOutput<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw apiError("internal_error", "Server produced invalid response", {
      details: formatIssues(parsed.error),
    });
  }
  return parsed.data;
}

/** Empty body — for fns that take no input but should still reject unknown fields. */
export const emptyInput = input(z.object({}).strict());

export { z };
