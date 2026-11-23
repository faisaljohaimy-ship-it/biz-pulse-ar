import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ASSET_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isAssetId = (value: string): boolean => ASSET_UUID.test(value);

const assetSchema = z.object({
  id: z.string().regex(ASSET_UUID),
  code: z.string(),
  name_ar: z.string(),
  name_en: z.string(),
  kind: z.string(),
  health: z.number().int().min(0).max(100),
  status: z.string(),
  last_seen_at: z.string().nullable(),
  updated_at: z.string().nullable().optional(),
});

export type AuthorizedAsset = z.infer<typeof assetSchema>;
export type AssetDetailResult =
  | { status: "ok"; asset: AuthorizedAsset; fetchedAt: string; authorizedUserId: string }
  | { status: "forbidden" | "not_available" | "source_error" };

// This outer middleware also covers invalid input and authentication failures.
const privateResponse = createMiddleware({ type: "function" }).server(async ({ next }) => {
  setResponseHeader("Cache-Control", "private, no-store, max-age=0");
  setResponseHeader("Vary", "Authorization");
  return next();
});

/** Exact real-row read. Caller JWT + existing admin/org RLS remain the authority. */
export const getAuthorizedAsset = createServerFn({ method: "GET" })
  .middleware([privateResponse, requireSupabaseAuth])
  .validator(z.object({ assetId: z.string().regex(ASSET_UUID) }))
  .handler(async ({ data, context }): Promise<AssetDetailResult> => {
    try {
      // Same current admin condition as live sec_assets RLS; never use an admin client.
      const role = await context.supabase
        .rpc("has_role", { _user_id: context.userId, _role: "admin" })
        .abortSignal(AbortSignal.timeout(5_000));
      if (role.error) return { status: role.error.code === "42501" ? "forbidden" : "source_error" };
      if (role.data !== true) return { status: "forbidden" };

      const result = await context.supabase
        .from("sec_assets")
        .select("id,code,name_ar,name_en,kind,health,status,last_seen_at,updated_at")
        .eq("id", data.assetId)
        .limit(1)
        .abortSignal(AbortSignal.timeout(5_000))
        .maybeSingle();
      if (result.error)
        return { status: result.error.code === "42501" ? "forbidden" : "source_error" };
      // RLS deliberately does not reveal whether an inaccessible row exists elsewhere.
      if (!result.data) return { status: "not_available" };
      const asset = assetSchema.safeParse(result.data);
      if (!asset.success) return { status: "source_error" };
      return {
        status: "ok",
        asset: asset.data,
        fetchedAt: new Date().toISOString(),
        authorizedUserId: context.userId,
      };
    } catch {
      return { status: "source_error" };
    }
  });
