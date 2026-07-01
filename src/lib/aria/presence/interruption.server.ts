/**
 * ARIA Presence — Interruption detector.
 *
 * Detects critical incidents/alerts newer than the presence cursor and
 * returns a compact bilingual interjection the client can surface
 * politely without derailing the current turn. Advances the cursor when
 * it fires so the same event does not interrupt twice.
 */
import { readCursor, writeCursor } from "./tiers.server";

export interface InterruptionSignal {
  hasInterruption: boolean;
  severity: "critical" | "elevated" | "none";
  title_en: string;
  title_ar: string;
  why_en: string;
  why_ar: string;
  ref?: { table: string; id: string };
  since_iso?: string;
}

async function importAdmin() {
  try {
    const mod = await import("@/integrations/supabase/client.server");
    return mod.supabaseAdmin;
  } catch {
    return null;
  }
}

const NONE: InterruptionSignal = {
  hasInterruption: false,
  severity: "none",
  title_en: "",
  title_ar: "",
  why_en: "",
  why_ar: "",
};

export async function detectInterruption(sessionId: string): Promise<InterruptionSignal> {
  const admin = await importAdmin();
  if (!admin) return NONE;

  const cursor = readCursor(sessionId);
  const since =
    cursor?.lastSeenAlertAt ??
    cursor?.lastVisitAt ??
    new Date(Date.now() - 10 * 60_000).toISOString();

  const [inc, alert] = await Promise.all([
    admin
      .from("sec_incidents")
      .select("id,title_en,title_ar,severity,reported_at,site_id")
      .eq("severity", "critical")
      .gt("reported_at", since)
      .order("reported_at", { ascending: false })
      .limit(1),
    admin
      .from("sim_notifications")
      .select("id,title,body,severity,created_at")
      .eq("severity", "critical")
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const incRow = inc.data?.[0];
  const alertRow = alert.data?.[0];
  if (!incRow && !alertRow) return NONE;

  const incAt = incRow?.reported_at ? Date.parse(incRow.reported_at) : 0;
  const alertAt = alertRow?.created_at ? Date.parse(alertRow.created_at) : 0;
  const useIncident = incAt >= alertAt;
  const nowISO = new Date().toISOString();

  if (useIncident && incRow) {
    writeCursor(sessionId, {
      ...(cursor ?? { lastVisitAt: nowISO }),
      lastSeenIncidentId: String(incRow.id),
      lastSeenAlertAt: incRow.reported_at ?? nowISO,
    });
    return {
      hasInterruption: true,
      severity: "critical",
      title_en: `Critical incident opened${incRow.site_id ? ` at ${incRow.site_id}` : ""}: ${incRow.title_en ?? incRow.title_ar ?? incRow.id}`,
      title_ar: `فُتحت حادثة حرجة${incRow.site_id ? ` في الموقع ${incRow.site_id}` : ""}: ${incRow.title_ar ?? incRow.title_en ?? incRow.id}`,
      why_en: "It intersects your current focus and requires acknowledgement before we continue.",
      why_ar: "تتقاطع مع تركيزك الحالي وتستدعي الإقرار قبل المتابعة.",
      ref: { table: "sec_incidents", id: String(incRow.id) },
      since_iso: incRow.reported_at ?? nowISO,
    };
  }

  if (alertRow) {
    writeCursor(sessionId, {
      ...(cursor ?? { lastVisitAt: nowISO }),
      lastSeenAlertAt: alertRow.created_at ?? nowISO,
    });
    return {
      hasInterruption: true,
      severity: "critical",
      title_en: `New critical alert: ${alertRow.title ?? alertRow.id}`,
      title_ar: `تنبيه حرج جديد: ${alertRow.title ?? alertRow.id}`,
      why_en: "Fresh evidence has arrived that changes the operational picture.",
      why_ar: "وردت أدلة جديدة تُغيّر الصورة التشغيلية.",
      ref: { table: "sim_notifications", id: String(alertRow.id) },
      since_iso: alertRow.created_at ?? nowISO,
    };
  }

  return NONE;
}
