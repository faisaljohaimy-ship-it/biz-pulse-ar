import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a compact, executive-grounded context block from live data for ARIA —
 * the Executive AI for Western Region Industrial Security. Read-only;
 * uses the request-scoped Supabase client so RLS is enforced as the calling user.
 */
export async function buildAriaContext(supabase: SupabaseClient): Promise<string> {
  try {
    const [
      sectionsQ,
      circlesQ,
      sitesQ,
      incidentsQ,
      patrolsQ,
      visitorsQ,
      permitsQ,
      contractorsQ,
      assetsQ,
      cctvQ,
      camerasQ,
      gatesQ,
      sensorsQ,
      workOrdersQ,
      projectsQ,
    ] = await Promise.all([
      supabase.from("sec_sections").select("name_ar,head,staff_count"),
      supabase.from("sec_circles").select("name_ar,manager,staff_count"),
      supabase.from("sec_sites").select("code,name_ar,sensitivity,status,guards_count"),
      supabase
        .from("sec_incidents")
        .select("ref,title_ar,category,severity,status,response_minutes,reported_at")
        .order("reported_at", { ascending: false })
        .limit(20),
      supabase
        .from("sec_patrols")
        .select("ref,team,route,status,checkpoints_done,checkpoints_total")
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(15),
      supabase.from("sec_visitors").select("status"),
      supabase.from("sec_permits").select("work_type,contractor,risk_level,status,ends_at"),
      supabase.from("sec_contractors").select("name,workers_count,compliance_score,status"),
      supabase.from("sec_assets").select("name_ar,kind,status,health"),
      supabase
        .from("sec_cctv_alerts")
        .select("camera_code,alert_type,confidence,status,detected_at")
        .order("detected_at", { ascending: false })
        .limit(15),
      supabase.from("sec_cameras").select("status,health"),
      supabase.from("sec_gates").select("status,health"),
      supabase.from("sec_sensors").select("status,sensor_type"),
      supabase
        .from("sec_work_orders")
        .select("ref,title_ar,kind,priority,status,assigned_to,due_at")
        .order("opened_at", { ascending: false })
        .limit(15),
      supabase
        .from("sec_projects")
        .select("ref,name_ar,kind,status,progress,budget_sar,spent_sar,health,ends_at")
        .order("ends_at", { ascending: true }),
    ]);

    const sections: string[] = [];

    sections.push("## الهيكل التنظيمي");
    sections.push("- إدارة الأمن الصناعي بالمنطقة الغربية");
    if (sectionsQ.data?.length) {
      sections.push("### الأقسام");
      sections.push(
        sectionsQ.data
          .map((s) => `- ${s.name_ar} — رئيس القسم: ${s.head ?? "—"} — موظفون: ${s.staff_count}`)
          .join("\n"),
      );
    }
    if (circlesQ.data?.length) {
      sections.push("### الدوائر التشغيلية");
      sections.push(
        circlesQ.data
          .map((c) => `- ${c.name_ar} — المدير: ${c.manager ?? "—"} — موظفون: ${c.staff_count}`)
          .join("\n"),
      );
    }

    if (sitesQ.data?.length) {
      const ops = sitesQ.data.filter((s) => s.status === "operational").length;
      sections.push(
        `## المواقع\nإجمالي: ${sitesQ.data.length} — تشغيلية: ${ops} — حساسية حرجة: ${sitesQ.data.filter((s) => s.sensitivity === "critical").length}`,
      );
    }

    if (incidentsQ.data?.length) {
      const open = incidentsQ.data.filter(
        (i) => i.status !== "resolved" && i.status !== "closed",
      ).length;
      const critical = incidentsQ.data.filter(
        (i) => i.severity === "critical" && i.status !== "closed",
      ).length;
      sections.push(
        `## البلاغات\nمفتوحة: ${open} — حرجة: ${critical} — إجمالي مرصود: ${incidentsQ.data.length}`,
      );
      sections.push("### آخر البلاغات");
      sections.push(
        incidentsQ.data
          .slice(0, 8)
          .map((i) => `- [${i.severity}] ${i.title_ar} (${i.ref} · ${i.category} · ${i.status})`)
          .join("\n"),
      );
    }

    if (patrolsQ.data?.length) {
      const active = patrolsQ.data.filter((p) => p.status === "active").length;
      sections.push(
        `## الدوريات\nنشطة: ${active} — مجدولة: ${patrolsQ.data.filter((p) => p.status === "scheduled").length}`,
      );
    }

    if (workOrdersQ.data?.length) {
      const open = workOrdersQ.data.filter(
        (w) => w.status !== "closed" && w.status !== "cancelled",
      ).length;
      const preventive = workOrdersQ.data.filter((w) => w.kind === "preventive").length;
      const corrective = workOrdersQ.data.filter((w) => w.kind === "corrective").length;
      sections.push(
        `## أوامر العمل (الصيانة)\nمفتوحة: ${open} — وقائية: ${preventive} — تصحيحية: ${corrective}`,
      );
      sections.push("### أهم أوامر العمل النشطة");
      sections.push(
        workOrdersQ.data
          .filter((w) => w.status !== "closed")
          .slice(0, 6)
          .map(
            (w) =>
              `- ${w.title_ar} [${w.kind}/${w.priority}] (${w.ref}) — ${w.assigned_to ?? "غير موكَّل"}`,
          )
          .join("\n"),
      );
    }

    if (projectsQ.data?.length) {
      const totalBudget = projectsQ.data.reduce((s, p) => s + Number(p.budget_sar), 0);
      const totalSpent = projectsQ.data.reduce((s, p) => s + Number(p.spent_sar), 0);
      sections.push(
        `## المشاريع\nجارية: ${projectsQ.data.filter((p) => p.status === "in-progress").length} — مكتملة: ${projectsQ.data.filter((p) => p.status === "completed").length} — مخطّطة: ${projectsQ.data.filter((p) => p.status === "planned").length}\nإجمالي الميزانية: ${totalBudget.toLocaleString("ar-SA")} ر.س — المصروف: ${totalSpent.toLocaleString("ar-SA")} ر.س`,
      );
      sections.push("### المشاريع الجارية");
      sections.push(
        projectsQ.data
          .filter((p) => p.status === "in-progress")
          .slice(0, 6)
          .map((p) => `- ${p.name_ar} [${p.kind}] — ${p.progress}% — صحة: ${p.health} (${p.ref})`)
          .join("\n"),
      );
    }

    if (camerasQ.data?.length) {
      const online = camerasQ.data.filter((c) => c.status === "online").length;
      const avgHealth = camerasQ.data.reduce((s, c) => s + c.health, 0) / camerasQ.data.length;
      sections.push(
        `## أنظمة CCTV\nكاميرات: ${camerasQ.data.length} — متصلة: ${online} — متوسط الصحة: ${Math.round(avgHealth)}%`,
      );
    }
    if (gatesQ.data?.length) {
      const online = gatesQ.data.filter((g) => g.status === "online").length;
      sections.push(`## التحكم بالدخول\nبوابات: ${gatesQ.data.length} — متصلة: ${online}`);
    }
    if (sensorsQ.data?.length) {
      const alarming = sensorsQ.data.filter((s) => s.status === "alarm").length;
      sections.push(`## الحساسات\nإجمالي: ${sensorsQ.data.length} — في حالة إنذار: ${alarming}`);
    }

    if (cctvQ.data?.length) {
      const newAlerts = cctvQ.data.filter((c) => c.status === "new").length;
      sections.push(`## تنبيهات CCTV\nجديدة: ${newAlerts}`);
      sections.push(
        cctvQ.data
          .slice(0, 5)
          .map(
            (c) =>
              `- ${c.alert_type} (${c.camera_code}) ثقة ${Math.round(c.confidence * 100)}% — ${c.status}`,
          )
          .join("\n"),
      );
    }

    if (visitorsQ.data?.length) {
      sections.push(
        `## الزوار\nبالداخل الآن: ${visitorsQ.data.filter((v) => v.status === "inside").length}`,
      );
    }
    if (permitsQ.data?.length) {
      sections.push(
        `## التصاريح\nفعّالة: ${permitsQ.data.filter((p) => p.status === "active" || p.status === "approved").length}`,
      );
    }
    if (contractorsQ.data?.length) {
      const avg = Math.round(
        contractorsQ.data.reduce((s, c) => s + c.compliance_score, 0) / contractorsQ.data.length,
      );
      sections.push(
        `## المقاولون\nنشطون: ${contractorsQ.data.filter((c) => c.status === "active").length} — متوسط الامتثال: ${avg}%`,
      );
    }
    if (assetsQ.data?.length) {
      const avg = Math.round(assetsQ.data.reduce((s, a) => s + a.health, 0) / assetsQ.data.length);
      sections.push(
        `## الأصول الأمنية\nمتصلة: ${assetsQ.data.filter((a) => a.status === "online").length} — متوسط الصحة: ${avg}%`,
      );
    }

    if (sections.length === 0) return "NO_INDUSTRIAL_SECURITY_DATA_AVAILABLE";
    return sections.join("\n\n");
  } catch {
    return "INDUSTRIAL_SECURITY_DATA_FETCH_FAILED";
  }
}
