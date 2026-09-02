import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a compact, executive-grounded context block from live data for SADEED —
 * the executive assistant for the whole Industrial Security sector. Read-only;
 * uses the request-scoped Supabase client so RLS is enforced as the calling user.
 */
export type SadeedContextSnapshot = {
  contextBlock: string;
  hasOperationalData: boolean;
  observedAt: string;
};

/**
 * سقف انتظار القاعدة قبل أول حرف — أمر المالك ٢٠٢٦/٠٩/٠٢ («اجعل تجاوب
 * سَدِيد فوريًّا بدون تأخير»): استعلامات اللقطة الخمسة عشر كانت تُنتظر
 * بلا حدّ، فقاعدةٌ معلّقة تعلّق أول حرفٍ معها. القيمة دون سقف `resilient`
 * (4s) عمدًا — هذا مسار محادثة لا نافذة عرض.
 */
const SNAPSHOT_DB_DEADLINE_MS = 2_500;

/**
 * لقطة من مجموعات التصدير الإنتاجية وحدها — بديل «بيانات لا تفرغ» حين
 * تتجاوز القاعدة سقفها الزمني أو تفشل: المشاريع الـ697 والصيانة الـ249
 * والبلاغات الـ3,427 تعيش في وحدات الخادم لا في القاعدة، فبطء القاعدة
 * لا يُفقر سَدِيد عنها — والأقسام الحيّة الغائبة غيابٌ مصرَّح به لا صمت.
 */
async function buildImportedDatasetsSnapshot(
  question: string | undefined,
  observedAt: string,
  reason: "db-timeout" | "db-error" | "db-empty",
): Promise<SadeedContextSnapshot> {
  const [
    { REAL_SEC_PROJECTS },
    { REAL_SEC_WORK_ORDERS },
    { REAL_INCIDENT_COUNTS },
    { buildMaintenanceContextSection, buildProjectsContextSection, MAINTENANCE_PRODUCTION_ORIGIN },
    { buildRecallBlock },
  ] = await Promise.all([
    import("@/lib/exec/projects-report.real.server"),
    import("@/lib/exec/maintenance-report.real.server"),
    import("@/lib/exec/event-report.real.server"),
    import("@/lib/sadeed/projects-maintenance-context.server"),
    import("@/lib/sadeed/projects-maintenance-recall.server"),
  ]);
  const sections: string[] = [
    "## النطاق التشغيلي",
    [
      "- قطاع الأمن الصناعي — لقطة من مجموعات التصدير الإنتاجية",
      reason === "db-timeout"
        ? "- الأقسام الحيّة (مواقع/دوريات/كاميرات…) تجاوزت مهلة القاعدة هذه الدورة — قل «غير متاحة الآن» عنها ولا تختلقها."
        : reason === "db-error"
          ? "- تعذّرت قراءة الأقسام الحيّة (مواقع/دوريات/كاميرات…) هذه الدورة — قل «غير متاحة الآن» عنها ولا تختلقها."
          : "- جداول القاعدة الحيّة (مواقع/دوريات/كاميرات…) فارغة — لا تختلق أقسامًا حيّة، وقل «لا صفوف حيّة» عند سؤالٍ عنها.",
    ].join("\n"),
    `## البلاغات [PROD:EVENT_REPORT]\nالإجمالي: ${REAL_INCIDENT_COUNTS.total} — مفتوحة: ${REAL_INCIDENT_COUNTS.open} — مغلقة: ${REAL_INCIDENT_COUNTS.closed}`,
    buildMaintenanceContextSection(REAL_SEC_WORK_ORDERS, MAINTENANCE_PRODUCTION_ORIGIN).join("\n"),
    buildProjectsContextSection(REAL_SEC_PROJECTS).join("\n"),
  ];
  if (question?.trim()) {
    const recall = buildRecallBlock(question, REAL_SEC_PROJECTS, REAL_SEC_WORK_ORDERS, {
      projects: "[PROD:PROJECTS_EXPORT]",
      maintenance: "[PROD:MAINTENANCE_EXPORT]",
    });
    if (recall) sections.push(recall);
  }
  return { contextBlock: sections.join("\n\n"), hasOperationalData: true, observedAt };
}

export async function buildSadeedContextSnapshot(
  supabase: SupabaseClient,
  /**
   * سؤال الدورة الحالية — أمر المالك ٢٠٢٦/٠٩/٠١ («ليرد بجميع ما يُطلب»):
   * حين يُمرَّر، تُحقن سجلّاتُ ما يمسّه من المشاريع والصيانة **كاملةَ
   * الحقول** فوق الخلاصات. اختياريّ فلا يتغيّر سلوك مستدعٍ لا يملك سؤالًا.
   */
  question?: string,
): Promise<SadeedContextSnapshot> {
  const observedAt = new Date().toISOString();
  try {
    const queriesPromise = Promise.all([
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
    // السقف الزمني قبل أول حرف (٢٠٢٦/٠٩/٠٢): قاعدةٌ معلّقة لا تعلّق
    // سَدِيد — بعد المهلة تُبنى اللقطة من مجموعات التصدير الإنتاجية.
    const raced = await Promise.race([
      queriesPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SNAPSHOT_DB_DEADLINE_MS)),
    ]);
    if (raced === null) {
      // رفضٌ متأخر بعد هجر الانتظار يبقى بلا معالج — يُكتم صراحةً.
      queriesPromise.catch(() => {});
      return buildImportedDatasetsSnapshot(question, observedAt, "db-timeout");
    }
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
    ] = raced;

    const queryResults = [
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
    ];
    const hasOperationalData = queryResults.some(
      (result) => Array.isArray(result.data) && result.data.length > 0,
    );
    if (!hasOperationalData) {
      // قاعدةٌ فارغة كليًّا ≠ «لا بيانات» (٢٠٢٦/٠٩/٠٢): المجموعات
      // الإنتاجية المستوردة (مشاريع/صيانة/بلاغات) تعيش في الخادم وتعرضها
      // الشاشات — فكان المصادَق يسقط هنا إلى محاكاة الزائر عمّا هو
      // إنتاجي أمامه. اللقطة تُبنى منها ويُصرَّح بفراغ الجداول الحيّة.
      return buildImportedDatasetsSnapshot(question, observedAt, "db-empty");
    }

    const sections: string[] = [];

    sections.push("## النطاق التشغيلي");
    sections.push("- قطاع الأمن الصناعي — جميع المناطق والمواقع المصرح بها للمستخدم");
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
              `- ${w.title_ar} [${w.kind}/${w.priority ?? "لم تُحدَّد"}] (${w.ref}) — ${w.assigned_to ?? "غير موكَّل"}`,
          )
          .join("\n"),
      );
    } else {
      // نفس علّة المشاريع: `sec_work_orders` فارغة، فالسياق يتبع المصدر
      // الذي تعرضه الشاشة نفسها — مجموعة تصدير SAP (249 أمرًا)، إنتاجيةٌ
      // بإقرار المالك ٢٠٢٦/٠٩/٠٢ «ارفع شارة المحاكاة، بيانات الصيانة
      // إنتاجية».
      const [
        { REAL_SEC_WORK_ORDERS },
        { buildMaintenanceContextSection, MAINTENANCE_PRODUCTION_ORIGIN },
      ] = await Promise.all([
        import("@/lib/exec/maintenance-report.real.server"),
        import("@/lib/sadeed/projects-maintenance-context.server"),
      ]);
      sections.push(
        ...buildMaintenanceContextSection(REAL_SEC_WORK_ORDERS, MAINTENANCE_PRODUCTION_ORIGIN),
      );
    }

    // **المشاريع: القاعدة أوّلًا، ثم المجموعة المستوردة (٢٠٢٦/٠٨/٣١).**
    // كان الشرط `if (projectsQ.data?.length)` وحده، و`sec_projects` فارغة —
    // ولذلك يسقط `getProjects` إلى المستوردة أصلًا فتراها الشاشة. فكان
    // سَدِيد وحده لا يرى ما يراه المستخدم أمامه: القسم يُتخطّى كليًّا على
    // الفارغ. الآن يتبع السياقُ المصدرَ نفسه الذي تتبعه الشاشة، فلا يفترق
    // جوابه عمّا تعرضه.
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
          .map(
            (p) =>
              `- ${p.name_ar} [${p.kind}] — ${p.progress}% — صحة: ${p.health ?? "لم تُقَس"} (${p.ref})`,
          )
          .join("\n"),
      );
    } else {
      const [{ REAL_SEC_PROJECTS }, { buildProjectsContextSection }] = await Promise.all([
        import("@/lib/exec/projects-report.real.server"),
        import("@/lib/sadeed/projects-maintenance-context.server"),
      ]);
      sections.push(...buildProjectsContextSection(REAL_SEC_PROJECTS));
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

    // ── استرجاعٌ بحسب السؤال (٢٠٢٦/٠٩/٠١) ──
    // الخلاصات أعلاه تجيب عن المجاميع؛ وهذا يجيب عن **المشروع بعينه**:
    // سجلّات كاملة الحقول لما مسّه السؤال، من المصدر نفسه الذي تعرضه
    // الشاشة — القاعدة حين تمتلئ، والمجموعة المستوردة/المحاكاة حين تفرغ.
    if (question?.trim()) {
      const [{ buildRecallBlock }, { REAL_SEC_PROJECTS }, { REAL_SEC_WORK_ORDERS }] =
        await Promise.all([
          import("@/lib/sadeed/projects-maintenance-recall.server"),
          import("@/lib/exec/projects-report.real.server"),
          import("@/lib/exec/maintenance-report.real.server"),
        ]);
      const projectPool = projectsQ.data?.length
        ? (projectsQ.data as import("@/lib/sec.functions").SecProject[])
        : REAL_SEC_PROJECTS;
      // مسبح الاسترجاع هو مصدر الشاشة نفسه: القاعدة حين تمتلئ، وتصدير
      // SAP المستورد حين تفرغ (٢٠٢٦/٠٩/٠٢ — بدل المحاكاة المولّدة).
      const orderPool = workOrdersQ.data?.length ? workOrdersQ.data : REAL_SEC_WORK_ORDERS;
      const recall = buildRecallBlock(question, projectPool, orderPool, {
        projects: "[PROD:PROJECTS_EXPORT]",
        maintenance: workOrdersQ.data?.length ? "[PROD:WORK_ORDERS]" : "[PROD:MAINTENANCE_EXPORT]",
      });
      if (recall) sections.push(recall);
    }

    return { contextBlock: sections.join("\n\n"), hasOperationalData: true, observedAt };
  } catch {
    // «بيانات لا تفرغ»: فشل القاعدة لا يعني غياب البيانات — المجموعات
    // الإنتاجية تعيش في الخادم. البديل الأخير وحده يصرّح بالفشل.
    try {
      return await buildImportedDatasetsSnapshot(question, observedAt, "db-error");
    } catch {
      return {
        contextBlock: "INDUSTRIAL_SECURITY_DATA_FETCH_FAILED",
        hasOperationalData: false,
        observedAt,
      };
    }
  }
}

/** Backward-compatible string form used by non-chat SADEED surfaces. */
export async function buildSadeedContext(supabase: SupabaseClient): Promise<string> {
  return (await buildSadeedContextSnapshot(supabase)).contextBlock;
}
