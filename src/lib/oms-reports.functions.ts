import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================================
// OMS Report Engine — PDF (pdf-lib) + Excel (xlsx). Pure-JS, Worker-safe.
// Returns base64 payloads so the browser can trigger a download without
// needing storage round-trips. Every generation is logged in sec_reports.
// ============================================================================

const REPORT_BUCKET = "uploads";

function u8ToBase64(bytes: Uint8Array): string {
  // Chunked conversion to avoid call-stack overflow on large buffers.
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa exists on Workers + Node 18+
  return btoa(binary);
}

function sanitize(s: string | null | undefined, max = 200): string {
  if (!s) return "—";
  // pdf-lib StandardFonts handle ASCII safely; strip control chars but keep
  // unicode for xlsx. PDFs render Arabic as glyphs missing in base fonts, so
  // we transliterate Arabic to a labelled English-friendly reference and keep
  // the Arabic text inside the xlsx + activity log.
  return s.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

function arabicToAscii(s: string): string {
  // If the string contains Arabic letters, we cannot render them via the
  // standard PDF font set. Show "[ar]" as a marker; the full Arabic text is
  // preserved in the activity log and Excel export.
  return /[\u0600-\u06FF]/.test(s) ? "[AR] " + s.replace(/[\u0600-\u06FF]/g, "·") : s;
}

// ───────────────────────────────────────────────────────────────────────────
// Incident PDF
// ───────────────────────────────────────────────────────────────────────────
async function buildIncidentPdf(inc: {
  ref: string; title_ar: string; title_en: string | null; category: string;
  severity: string; priority: string | null; status: string;
  ai_risk_score: number | null; ai_summary: string | null;
  reported_at: string; resolved_at: string | null; response_minutes: number | null;
  owner: string | null; assigned_to: string | null;
  root_cause: string | null; executive_review: string | null;
  corrective_actions: unknown; attachments: unknown; escalated: boolean;
}, timeline: Array<{ event: string; actor_name: string | null; occurred_at: string }>): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.size();
  let y = height - 50;

  const ink = rgb(0.04, 0.1, 0.18);
  const accent = rgb(0, 0.55, 0.85);
  const muted = rgb(0.4, 0.45, 0.55);

  const drawText = (text: string, opts: { x?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    const x = opts.x ?? 40;
    const size = opts.size ?? 10;
    if (y < 50) { page = pdf.addPage([595.28, 841.89]); y = height - 50; }
    page.drawText(sanitize(arabicToAscii(text), 400), { x, y, size, font: opts.bold ? bold : font, color: opts.color ?? ink });
    y -= size + 6;
  };

  const hr = () => {
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: muted });
    y -= 10;
  };

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.02, 0.1, 0.18) });
  page.drawText("NEXUS AI OS — Incident Report", { x: 40, y: height - 40, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Industrial Security · Western Region · ${new Date().toISOString().slice(0, 10)}`, { x: 40, y: height - 60, size: 9, font, color: rgb(0.7, 0.85, 1) });
  y = height - 110;

  drawText(`Incident Ref: ${inc.ref}`, { bold: true, size: 13, color: accent });
  drawText(`Title (AR): ${inc.title_ar}`);
  if (inc.title_en) drawText(`Title (EN): ${inc.title_en}`);
  hr();

  drawText("Classification", { bold: true, size: 11, color: accent });
  drawText(`Category: ${inc.category}    Severity: ${inc.severity.toUpperCase()}    Priority: ${(inc.priority ?? "—").toUpperCase()}    Status: ${inc.status.toUpperCase()}`);
  drawText(`Risk Score: ${inc.ai_risk_score ?? "—"}/100${inc.escalated ? "    *** ESCALATED ***" : ""}`);
  hr();

  drawText("Ownership", { bold: true, size: 11, color: accent });
  drawText(`Owner: ${inc.owner ?? "—"}    Assigned to: ${inc.assigned_to ?? "—"}`);
  drawText(`Reported: ${new Date(inc.reported_at).toISOString().replace("T", " ").slice(0, 19)}`);
  if (inc.resolved_at) drawText(`Resolved: ${new Date(inc.resolved_at).toISOString().replace("T", " ").slice(0, 19)}   (response ${inc.response_minutes ?? "—"} min)`);
  hr();

  if (inc.ai_summary) {
    drawText("ARIA Executive Summary", { bold: true, size: 11, color: accent });
    drawText(inc.ai_summary);
    hr();
  }

  if (inc.root_cause) {
    drawText("Root Cause", { bold: true, size: 11, color: accent });
    drawText(inc.root_cause);
    hr();
  }

  if (inc.executive_review) {
    drawText("Executive Review", { bold: true, size: 11, color: accent });
    drawText(inc.executive_review);
    hr();
  }

  const acts = Array.isArray(inc.corrective_actions) ? inc.corrective_actions as Array<{ action: string; owner?: string; added_at?: string; done?: boolean }> : [];
  if (acts.length) {
    drawText(`Corrective Actions (${acts.length})`, { bold: true, size: 11, color: accent });
    acts.forEach((a, i) => drawText(`${i + 1}. [${a.done ? "DONE" : "OPEN"}] ${a.action}   — ${a.owner ?? "—"}`));
    hr();
  }

  const atts = Array.isArray(inc.attachments) ? inc.attachments as Array<{ file_name: string; uploaded_at?: string; uploaded_by?: string }> : [];
  if (atts.length) {
    drawText(`Attachments (${atts.length})`, { bold: true, size: 11, color: accent });
    atts.forEach((a, i) => drawText(`${i + 1}. ${a.file_name}   — ${a.uploaded_by ?? "—"}   ${a.uploaded_at?.slice(0, 19) ?? ""}`));
    hr();
  }

  if (timeline.length) {
    drawText(`Activity Timeline (${timeline.length} events)`, { bold: true, size: 11, color: accent });
    timeline.slice(0, 25).forEach((e) =>
      drawText(`• ${e.occurred_at.slice(0, 19).replace("T", " ")}   ${e.event}   — ${e.actor_name ?? "—"}`, { size: 9, color: muted }),
    );
    if (timeline.length > 25) drawText(`… and ${timeline.length - 25} more events`, { size: 9, color: muted });
  }

  // Footer
  const totalPages = pdf.getPageCount();
  pdf.getPages().forEach((p, i) => {
    p.drawText(`Generated by NEXUS AI OS — Page ${i + 1} / ${totalPages}`, { x: 40, y: 25, size: 8, font, color: muted });
    p.drawText(`Ref: ${inc.ref}`, { x: width - 120, y: 25, size: 8, font, color: muted });
  });

  return pdf.save();
}

export const generateIncidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      incident_id: z.string().uuid(),
      format: z.enum(["pdf", "xlsx"]).default("pdf"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName = (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";

    const { data: inc, error } = await supabase
      .from("sec_incidents")
      .select("*")
      .eq("id", data.incident_id)
      .single();
    if (error) throw new Error(error.message);

    const { data: events } = await supabase
      .from("sec_activity_events")
      .select("event, actor_name, occurred_at, payload")
      .eq("entity_type", "incident")
      .eq("entity_id", data.incident_id)
      .order("occurred_at", { ascending: true });
    const timeline = (events ?? []) as Array<{ event: string; actor_name: string | null; occurred_at: string; payload: unknown }>;

    let bytes: Uint8Array;
    let mime: string;
    let ext: string;
    if (data.format === "pdf") {
      bytes = await buildIncidentPdf(inc, timeline);
      mime = "application/pdf";
      ext = "pdf";
    } else {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const summary = XLSX.utils.aoa_to_sheet([
        ["Field", "Value"],
        ["Ref", inc.ref],
        ["Title (AR)", inc.title_ar],
        ["Title (EN)", inc.title_en ?? ""],
        ["Category", inc.category],
        ["Severity", inc.severity],
        ["Priority", inc.priority ?? ""],
        ["Status", inc.status],
        ["Escalated", inc.escalated ? "YES" : "NO"],
        ["Risk Score", inc.ai_risk_score ?? ""],
        ["Owner", inc.owner ?? ""],
        ["Assigned To", inc.assigned_to ?? ""],
        ["Reported At", inc.reported_at],
        ["Resolved At", inc.resolved_at ?? ""],
        ["Response (min)", inc.response_minutes ?? ""],
        ["Root Cause", inc.root_cause ?? ""],
        ["Executive Review", inc.executive_review ?? ""],
        ["ARIA Summary", inc.ai_summary ?? ""],
        ["ARIA Auto-Analyzed", inc.aria_auto_analyzed ? "YES" : "NO"],
      ]);
      XLSX.utils.book_append_sheet(wb, summary, "Incident");

      const acts = Array.isArray(inc.corrective_actions) ? inc.corrective_actions as Array<{ action: string; owner?: string; added_at?: string; done?: boolean }> : [];
      const actsSheet = XLSX.utils.aoa_to_sheet([
        ["#", "Action", "Owner", "Added", "Done"],
        ...acts.map((a, i) => [i + 1, a.action, a.owner ?? "", a.added_at ?? "", a.done ? "YES" : "NO"]),
      ]);
      XLSX.utils.book_append_sheet(wb, actsSheet, "Corrective Actions");

      const tlSheet = XLSX.utils.aoa_to_sheet([
        ["Timestamp", "Event", "Actor", "Payload"],
        ...timeline.map((e) => [e.occurred_at, e.event, e.actor_name ?? "", JSON.stringify(e.payload ?? {})]),
      ]);
      XLSX.utils.book_append_sheet(wb, tlSheet, "Timeline");

      bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
      mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      ext = "xlsx";
    }

    // Upload to storage + log in sec_reports
    const storage_path = `incident-reports/${inc.ref}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(REPORT_BUCKET).upload(storage_path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) console.warn("[report upload]", upErr.message);

    const { data: reportRow } = await supabase
      .from("sec_reports")
      .insert({
        kind: "incident",
        format: ext,
        title: `Incident Report ${inc.ref}`,
        related_entity_type: "incident",
        related_entity_id: inc.id,
        related_entity_ref: inc.ref,
        storage_path: upErr ? null : storage_path,
        size_bytes: bytes.length,
        generated_by: userId,
        generated_by_name: actorName,
        meta: { severity: inc.severity, status: inc.status, risk_score: inc.ai_risk_score },
      })
      .select("id")
      .single();

    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: inc.id,
      entity_ref: inc.ref,
      event: `report_generated_${ext}`,
      actor_id: userId,
      actor_name: actorName,
      payload: { report_id: reportRow?.id ?? null, size_bytes: bytes.length },
    });

    return {
      file_name: `${inc.ref}.${ext}`,
      mime_type: mime,
      base64: u8ToBase64(bytes),
      size_bytes: bytes.length,
      report_id: reportRow?.id ?? null,
    };
  });

// ───────────────────────────────────────────────────────────────────────────
// Daily Operations Report (xlsx) — aggregated across incidents/WOs/permits
// ───────────────────────────────────────────────────────────────────────────
export const generateDailyOperationsReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName = (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const day = data.date ?? new Date().toISOString().slice(0, 10);
    const from = new Date(`${day}T00:00:00.000Z`).toISOString();
    const to = new Date(new Date(from).getTime() + 24 * 3600 * 1000).toISOString();

    const [inc, wo, perm, acts] = await Promise.all([
      supabase.from("sec_incidents").select("ref,title_ar,category,severity,status,priority,ai_risk_score,owner,assigned_to,reported_at,resolved_at,response_minutes,escalated").gte("reported_at", from).lt("reported_at", to).order("reported_at"),
      supabase.from("sec_work_orders").select("ref,title_ar,kind,status,priority,assigned_to,contractor,opened_at,due_at,closed_at").gte("opened_at", from).lt("opened_at", to).order("opened_at"),
      supabase.from("sec_permits").select("ref,work_type,contractor,risk_level,status,starts_at,ends_at").gte("starts_at", from).lt("starts_at", to).order("starts_at"),
      supabase.from("sec_activity_events").select("entity_type,entity_ref,event,actor_name,occurred_at").gte("occurred_at", from).lt("occurred_at", to).order("occurred_at"),
    ]);

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const overview = XLSX.utils.aoa_to_sheet([
      ["NEXUS AI OS — Daily Operations Report"],
      ["Date", day],
      ["Generated", new Date().toISOString()],
      ["Generated By", actorName],
      [],
      ["Section", "Count"],
      ["Incidents", (inc.data ?? []).length],
      ["  · Critical", (inc.data ?? []).filter((i) => i.severity === "critical").length],
      ["  · Escalated", (inc.data ?? []).filter((i) => i.escalated).length],
      ["Work Orders", (wo.data ?? []).length],
      ["Permits", (perm.data ?? []).length],
      ["Activity Events", (acts.data ?? []).length],
    ]);
    XLSX.utils.book_append_sheet(wb, overview, "Overview");

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(inc.data ?? []),
      "Incidents",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(wo.data ?? []),
      "Work Orders",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(perm.data ?? []),
      "Permits",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(acts.data ?? []),
      "Activity",
    );

    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
    const storage_path = `daily-reports/${day}-${Date.now()}.xlsx`;
    const { error: upErr } = await supabase.storage.from(REPORT_BUCKET).upload(storage_path, bytes, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: false,
    });
    if (upErr) console.warn("[daily report upload]", upErr.message);

    const { data: reportRow } = await supabase
      .from("sec_reports")
      .insert({
        kind: "daily",
        format: "xlsx",
        title: `Daily Operations — ${day}`,
        storage_path: upErr ? null : storage_path,
        size_bytes: bytes.length,
        range_from: from,
        range_to: to,
        generated_by: userId,
        generated_by_name: actorName,
        meta: {
          incidents: (inc.data ?? []).length,
          work_orders: (wo.data ?? []).length,
          permits: (perm.data ?? []).length,
        },
      })
      .select("id")
      .single();

    return {
      file_name: `daily-ops-${day}.xlsx`,
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: u8ToBase64(bytes),
      size_bytes: bytes.length,
      report_id: reportRow?.id ?? null,
    };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sec_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getReportDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ report_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sec_reports")
      .select("storage_path")
      .eq("id", data.report_id)
      .single();
    if (error) throw new Error(error.message);
    if (!row?.storage_path) return { url: null };
    const { data: signed, error: e2 } = await context.supabase
      .storage.from(REPORT_BUCKET).createSignedUrl(row.storage_path, 600);
    if (e2) throw new Error(e2.message);
    return { url: signed.signedUrl };
  });
