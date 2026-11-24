import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  projectCriticalHandover,
  reviewCoverage,
  reviewExpiry,
  type OperationalReviewRow,
  type HandoverCase,
  type ReviewRead,
  type ReviewSource,
} from "./operational-read-review";

const privateResponse = createMiddleware({ type: "function" }).server(async ({ next }) => {
  setResponseHeader("Cache-Control", "private, no-store, max-age=0");
  setResponseHeader("Vary", "Authorization");
  return next();
});
const common = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  status: z.string().nullable(),
  updated_at: z.string().nullable(),
});
const schemas = {
  sec_incidents: common.extend({ severity: z.string().nullable(), owner: z.string().nullable() }),
  sec_permits: common.extend({ starts_at: z.string().nullable(), ends_at: z.string().nullable() }),
  sec_contractors: common.extend({
    expires_at: z.string().nullable(),
    insurance_expiry: z.string().nullable(),
  }),
};
const SOURCE_COLUMNS = {
  sec_incidents: "id,org_id,status,updated_at,severity,owner",
  sec_permits: "id,org_id,status,updated_at,starts_at,ends_at",
  sec_contractors: "id,org_id,status,updated_at,expires_at,insurance_expiry",
} as const;

export type OperationalReadReviewResult =
  | { status: "unavailable" }
  | {
      status: "ok";
      accountId: string;
      organizationId: string;
      asOf: string;
      timezone: "UTC";
      handover: Omit<ReturnType<typeof projectCriticalHandover>, "cases"> & {
        cases: (Omit<HandoverCase, "owner"> & { ownerRecorded: boolean })[] | null;
      };
      permits: ReturnType<typeof reviewExpiry>;
      contractors: ReturnType<typeof reviewExpiry>;
      reads: ReviewRead[];
    };

export const getOperationalReadReview = createServerFn({ method: "GET" })
  .middleware([privateResponse, requireSupabaseAuth])
  .validator(z.object({ organizationId: z.string().uuid() }).strict())
  .handler(async ({ data, context }): Promise<OperationalReadReviewResult> => {
    const asOf = new Date().toISOString();
    const organizationId = data.organizationId;
    try {
      // Reuse the existing organization-membership contract with the caller client;
      // explicit organization selection never grants access and no admin client is used.
      const member = await context.supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", context.userId)
        .eq("org_id", organizationId)
        .limit(1)
        .abortSignal(AbortSignal.timeout(4000))
        .maybeSingle();
      if (member.error || member.data?.org_id !== organizationId)
        return { status: "unavailable" as const };
      const read = async (source: ReviewSource): Promise<ReviewRead> => {
        const scope = {
          accountId: context.userId,
          organizationId,
          source,
          fetchedAt: asOf,
          limit: 500,
          total: null as number | null,
        };
        try {
          const result = await context.supabase
            .from(source)
            .select(SOURCE_COLUMNS[source], { count: "exact" })
            .eq("org_id", organizationId)
            .order("id", { ascending: true })
            .limit(scope.limit)
            .abortSignal(AbortSignal.timeout(4000));
          scope.fetchedAt = new Date().toISOString();
          if (result.error || !Array.isArray(result.data))
            return { state: "source_error", scope, rows: null };
          const parsed = z.array(schemas[source]).safeParse(result.data);
          if (!parsed.success) return { state: "source_error", scope, rows: null };
          scope.total = result.count;
          const accepted: ReviewRead = {
            state: "ready",
            scope,
            rows: parsed.data as OperationalReviewRow[],
          };
          return reviewCoverage(accepted).state === "unavailable"
            ? { state: "source_error", scope, rows: null }
            : accepted;
        } catch {
          return {
            state: "source_error",
            scope: { ...scope, fetchedAt: new Date().toISOString() },
            rows: null,
          };
        }
      };
      const [incidents, permits, contractors] = await Promise.all([
        read("sec_incidents"),
        read("sec_permits"),
        read("sec_contractors"),
      ]);
      const reviewedAt = new Date().toISOString();
      const handover = projectCriticalHandover(incidents);
      return {
        status: "ok" as const,
        accountId: context.userId,
        organizationId,
        asOf: reviewedAt,
        timezone: "UTC" as const,
        handover: {
          ...handover,
          cases:
            handover.cases?.map(({ owner, ...item }) => ({
              ...item,
              ownerRecorded: Boolean(owner?.trim()),
            })) ?? null,
        },
        permits: reviewExpiry(permits, reviewedAt),
        contractors: reviewExpiry(contractors, reviewedAt),
        // Do not expose personal owner text in this summary; the handover projection
        // itself preserves it, while this surface displays ownership completeness.
        reads: [incidents, permits, contractors].map((result): ReviewRead =>
          result.state === "ready"
            ? { ...result, rows: result.rows.map((row) => ({ ...row, owner: undefined })) }
            : result,
        ),
      };
    } catch {
      return { status: "unavailable" as const };
    }
  });
