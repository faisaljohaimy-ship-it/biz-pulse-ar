import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================================
// Access Management — Visitors · Contractors · Vehicles · Gates
// Every write emits sec_activity_events for the timeline + KPI engine.
// ============================================================================

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function genRef(prefix: string) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

function actorOf(claims: unknown): string {
  const c = (claims ?? {}) as { user_metadata?: { name?: string }; email?: string };
  return c.user_metadata?.name ?? c.email ?? "مستخدم";
}

// ============================================================================
// OVERVIEW (single fetch for the /sec/access dashboard)
// ============================================================================

export const getAccessOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [visitorsRes, contractorsRes, vehiclesRes, gatesRes, deniedRes, sitesRes] = await Promise.all([
      supabase.from("sec_visitors").select("id,ref,full_name,organization,host,purpose,badge_no,status,vehicle_plate,expected_at,check_in_at,check_out_at,phone,site_id,gate_id").order("check_in_at", { ascending: false }).limit(200),
      supabase.from("sec_contractors").select("id,ref,name,contract_no,workers_count,compliance_score,status,expires_at,phone,email,permit_types,insurance_expiry").order("updated_at", { ascending: false }).limit(200),
      supabase.from("sec_vehicles").select("id,ref,plate,vehicle_type,company,driver_name,driver_phone,status,site_id,gate_id,permit_no,permit_expires_at,check_in_at,check_out_at,contractor_id").order("updated_at", { ascending: false }).limit(200),
      supabase.from("sec_gates").select("id,code,kind,status,health,events_today,last_event_at,site_id,building_id").order("code"),
      supabase.from("sec_activity_events").select("id,event,payload,occurred_at,entity_type,entity_ref,actor_name").eq("event", "access_denied").order("occurred_at", { ascending: false }).limit(20),
      supabase.from("sec_sites").select("id,code,name_ar,name_en"),
    ]);

    const errs = [visitorsRes.error, contractorsRes.error, vehiclesRes.error, gatesRes.error, deniedRes.error, sitesRes.error].filter(Boolean);
    if (errs.length) throw new Error(errs.map((e) => e!.message).join("; "));

    const visitors = visitorsRes.data ?? [];
    const contractors = contractorsRes.data ?? [];
    const vehicles = vehiclesRes.data ?? [];
    const gates = gatesRes.data ?? [];
    const denied = deniedRes.data ?? [];

    const now = Date.now();
    const expiringContractors = contractors.filter((c) => c.expires_at && new Date(c.expires_at).getTime() - now < 1000 * 60 * 60 * 24 * 30);
    const expiringInsurance = contractors.filter((c) => c.insurance_expiry && new Date(c.insurance_expiry).getTime() - now < 1000 * 60 * 60 * 24 * 30);

    return {
      visitors,
      contractors,
      vehicles,
      gates,
      denied_events: denied,
      sites: sitesRes.data ?? [],
      kpis: {
        visitors_inside: visitors.filter((v) => v.status === "inside").length,
        visitors_expected: visitors.filter((v) => v.status === "expected").length,
        visitors_today: visitors.filter((v) => v.check_in_at && new Date(v.check_in_at).toDateString() === new Date().toDateString()).length,
        contractors_active: contractors.filter((c) => c.status === "active").length,
        contractors_expiring_30d: expiringContractors.length,
        insurance_expiring_30d: expiringInsurance.length,
        vehicles_inside: vehicles.filter((v) => v.status === "inside").length,
        vehicles_expected: vehicles.filter((v) => v.status === "expected").length,
        vehicles_denied: vehicles.filter((v) => v.status === "denied" || v.status === "blacklisted").length,
        gates_online: gates.filter((g) => g.status === "online").length,
        gates_degraded: gates.filter((g) => g.status === "degraded").length,
        gates_offline: gates.filter((g) => g.status === "offline").length,
        access_denied_24h: denied.length,
      },
    };
  });

// ============================================================================
// VISITORS
// ============================================================================

const createVisitorSchema = z.object({
  full_name: z.string().min(2).max(160),
  organization: z.string().max(160).optional(),
  host: z.string().min(2).max(160),
  purpose: z.string().max(500).optional(),
  badge_no: z.string().max(60).optional(),
  id_number: z.string().max(40).optional(),
  phone: z.string().max(40).optional(),
  vehicle_plate: z.string().max(40).optional(),
  site_id: z.string().uuid().nullable().optional(),
  gate_id: z.string().uuid().nullable().optional(),
  expected_at: z.string().optional(),
  status: z.enum(["expected", "inside"]).default("inside"),
});

export const createVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createVisitorSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    const ref = genRef("VIS");
    const qr_token = `${ref}.${Math.random().toString(36).slice(2, 10)}`;
    const { data: row, error } = await supabase
      .from("sec_visitors")
      .insert({
        ref,
        full_name: data.full_name,
        organization: data.organization ?? null,
        host: data.host,
        purpose: data.purpose ?? null,
        badge_no: data.badge_no ?? null,
        id_number: data.id_number ?? null,
        phone: data.phone ?? null,
        vehicle_plate: data.vehicle_plate ?? null,
        site_id: data.site_id ?? null,
        gate_id: data.gate_id ?? null,
        expected_at: data.expected_at ?? null,
        status: data.status,
        qr_token,
        check_in_at: data.status === "inside" ? new Date().toISOString() : (data.expected_at ?? new Date().toISOString()),
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("sec_activity_events").insert({
      entity_type: "visitor",
      entity_id: row.id,
      entity_ref: ref,
      event: data.status === "inside" ? "visitor_checked_in" : "visitor_pre_registered",
      actor_id: userId,
      actor_name: actor,
      payload: { host: data.host, organization: data.organization ?? null, vehicle_plate: data.vehicle_plate ?? null } as JsonValue,
    });
    return row;
  });

export const checkOutVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ visitor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    const { data: row, error } = await supabase
      .from("sec_visitors")
      .update({ status: "left", check_out_at: new Date().toISOString() })
      .eq("id", data.visitor_id)
      .select("ref, check_in_at")
      .single();
    if (error) throw new Error(error.message);
    const stayMinutes = row.check_in_at
      ? Math.max(1, Math.round((Date.now() - new Date(row.check_in_at).getTime()) / 60000))
      : null;
    await supabase.from("sec_activity_events").insert({
      entity_type: "visitor",
      entity_id: data.visitor_id,
      entity_ref: row.ref,
      event: "visitor_checked_out",
      actor_id: userId,
      actor_name: actor,
      payload: { stay_minutes: stayMinutes } as JsonValue,
    });
    return { ok: true, stay_minutes: stayMinutes };
  });

export const checkInExpectedVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ visitor_id: z.string().uuid(), badge_no: z.string().max(60).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    const { data: row, error } = await supabase
      .from("sec_visitors")
      .update({
        status: "inside",
        check_in_at: new Date().toISOString(),
        ...(data.badge_no ? { badge_no: data.badge_no } : {}),
      })
      .eq("id", data.visitor_id)
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "visitor",
      entity_id: data.visitor_id,
      entity_ref: row.ref,
      event: "visitor_checked_in",
      actor_id: userId,
      actor_name: actor,
      payload: { badge_no: data.badge_no ?? null } as JsonValue,
    });
    return { ok: true };
  });

// ============================================================================
// CONTRACTORS
// ============================================================================

const createContractorSchema = z.object({
  name: z.string().min(2).max(160),
  contract_no: z.string().min(1).max(80),
  workers_count: z.number().int().min(0).max(100000).default(0),
  compliance_score: z.number().int().min(0).max(100).default(90),
  status: z.enum(["active", "suspended", "blacklisted", "expired"]).default("active"),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(160).optional(),
  permit_types: z.array(z.string().max(40)).default([]),
  expires_at: z.string().optional(),
  insurance_expiry: z.string().optional(),
  allowed_site_ids: z.array(z.string().uuid()).default([]),
});

export const createContractor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createContractorSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    const ref = genRef("CON");
    const { data: row, error } = await supabase
      .from("sec_contractors")
      .insert({
        ref,
        name: data.name,
        contract_no: data.contract_no,
        workers_count: data.workers_count,
        compliance_score: data.compliance_score,
        status: data.status,
        phone: data.phone ?? null,
        email: data.email ?? null,
        permit_types: data.permit_types,
        allowed_site_ids: data.allowed_site_ids,
        expires_at: data.expires_at ?? null,
        insurance_expiry: data.insurance_expiry ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "contractor",
      entity_id: row.id,
      entity_ref: ref,
      event: "contractor_registered",
      actor_id: userId,
      actor_name: actor,
      payload: { name: data.name, contract_no: data.contract_no, workers: data.workers_count } as JsonValue,
    });
    return row;
  });

export const updateContractorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      contractor_id: z.string().uuid(),
      status: z.enum(["active", "suspended", "blacklisted", "expired"]),
      reason: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    const { data: row, error } = await supabase
      .from("sec_contractors")
      .update({ status: data.status })
      .eq("id", data.contractor_id)
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "contractor",
      entity_id: data.contractor_id,
      entity_ref: row.ref,
      event: `contractor_${data.status}`,
      actor_id: userId,
      actor_name: actor,
      payload: { reason: data.reason ?? null } as JsonValue,
    });
    return { ok: true };
  });

// ============================================================================
// VEHICLES
// ============================================================================

const createVehicleSchema = z.object({
  plate: z.string().min(2).max(40),
  vehicle_type: z.enum(["car", "truck", "tanker", "service", "emergency", "bus", "other"]).default("car"),
  company: z.string().max(160).optional(),
  driver_name: z.string().min(2).max(160),
  driver_phone: z.string().max(40).optional(),
  driver_id_number: z.string().max(40).optional(),
  contractor_id: z.string().uuid().nullable().optional(),
  site_id: z.string().uuid().nullable().optional(),
  gate_id: z.string().uuid().nullable().optional(),
  permit_no: z.string().max(60).optional(),
  permit_expires_at: z.string().optional(),
  status: z.enum(["expected", "inside"]).default("inside"),
  notes: z.string().max(2000).optional(),
});

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createVehicleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    const ref = genRef("VEH");
    const { data: row, error } = await supabase
      .from("sec_vehicles")
      .insert({
        ref,
        plate: data.plate,
        vehicle_type: data.vehicle_type,
        company: data.company ?? null,
        driver_name: data.driver_name,
        driver_phone: data.driver_phone ?? null,
        driver_id_number: data.driver_id_number ?? null,
        contractor_id: data.contractor_id ?? null,
        site_id: data.site_id ?? null,
        gate_id: data.gate_id ?? null,
        permit_no: data.permit_no ?? null,
        permit_expires_at: data.permit_expires_at ?? null,
        status: data.status,
        check_in_at: data.status === "inside" ? new Date().toISOString() : null,
        notes: data.notes ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "vehicle",
      entity_id: row.id,
      entity_ref: ref,
      event: data.status === "inside" ? "vehicle_checked_in" : "vehicle_pre_registered",
      actor_id: userId,
      actor_name: actor,
      payload: { plate: data.plate, driver: data.driver_name, type: data.vehicle_type } as JsonValue,
    });
    return row;
  });

export const vehicleCheckOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vehicle_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    const { data: row, error } = await supabase
      .from("sec_vehicles")
      .update({ status: "left", check_out_at: new Date().toISOString() })
      .eq("id", data.vehicle_id)
      .select("ref, plate")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "vehicle",
      entity_id: data.vehicle_id,
      entity_ref: row.ref,
      event: "vehicle_checked_out",
      actor_id: userId,
      actor_name: actor,
      payload: { plate: row.plate } as JsonValue,
    });
    return { ok: true };
  });

export const denyVehicleAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      plate: z.string().min(2).max(40),
      gate_id: z.string().uuid().nullable().optional(),
      reason: z.string().min(2).max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    await supabase.from("sec_activity_events").insert({
      entity_type: "access_attempt",
      entity_id: crypto.randomUUID(),
      entity_ref: data.plate,
      event: "access_denied",
      actor_id: userId,
      actor_name: actor,
      payload: { plate: data.plate, gate_id: data.gate_id ?? null, reason: data.reason, target: "vehicle" } as JsonValue,
    });
    return { ok: true };
  });

// ============================================================================
// GATES
// ============================================================================

export const setGateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      gate_id: z.string().uuid(),
      status: z.enum(["online", "degraded", "offline", "maintenance"]),
      health: z.number().int().min(0).max(100).optional(),
      reason: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actor = actorOf(claims);
    const { data: row, error } = await supabase
      .from("sec_gates")
      .update({
        status: data.status,
        last_event_at: new Date().toISOString(),
        ...(typeof data.health === "number" ? { health: data.health } : {}),
      })
      .eq("id", data.gate_id)
      .select("code")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "gate",
      entity_id: data.gate_id,
      entity_ref: row.code,
      event: "gate_status_changed",
      actor_id: userId,
      actor_name: actor,
      payload: { status: data.status, health: data.health ?? null, reason: data.reason ?? null } as JsonValue,
    });
    return { ok: true };
  });
