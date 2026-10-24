/**
 * قراءات الرئيسية — **مصدرٌ واحد لكل استعلامات مركز القيادة.**
 *
 * نُقلت من `HomeDashboard.tsx` (أمر المالك ٢٠٢٦/١٠/١٣ — المرحلة الأولى)
 * لأن صفوف الرئيسية صارت ملفّاتٍ متوازية: المؤشرات · الخريطة · سَدِيد ·
 * التشغيل · التحليلات. وكلّها تقرأ من هنا بالمفاتيح نفسها، فتتشارك ذاكرة
 * react-query: **رقمٌ في المؤشر وقائمةٌ تحته من الصفوف نفسها** (المادة ٢٧ —
 * «مصدرٌ واحد لكل رقم»)، وطلبٌ واحد لا سبعة.
 *
 * ثلاث قواعد تحكم كل استعلام هنا:
 *   ① البوابة الوحيدة `enabled: !authLoading` — لا `enabled: !!user` على
 *     قراءة عرض (الطبقة ٤): الزائر يرى ما يراه صاحب الجلسة.
 *   ② المفاتيح مشتركة مع شاشاتها حيث وُجدت (`blueprint-state` تقرؤه ترويسة
 *     النظام لجرسها) — تغييرها يضاعف الطلبات بصمت.
 *   ③ **ما لا بديل له لا يُعاد صامتًا** (المادة ١٤): الصيانة بيانات حقيقية بلا
 *     محاكاة (قرار ٢٠٢٦/١٠/٠٦)، وإعادة react-query الافتراضية (٣× بتراجع)
 *     تُبقي الهيكل ~٢٥ ثانية فوق مهلة الخادم ٤ ثوانٍ — فـ`retry: false`
 *     والإعادة بيد المستخدم.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getSecOverview } from "@/lib/sec.functions";
import { getOmsKpis } from "@/lib/oms.functions.reports";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { getRiskBoard } from "@/lib/exec/risk-board.functions";
import { getIntegrationsOverview } from "@/lib/integrations-hub.functions";
import { getExecKpis } from "@/lib/sec-exec-kpis.functions";
import { getMaintSummary } from "@/lib/maint.functions";
import { getProjectsSummary } from "@/lib/projects-summary.functions";

export function useHomeReads() {
  // البوابة الوحيدة `!authLoading` — لا `enabled: !!user` على قراءة عرض.
  const { user, loading: authLoading } = useAuth();
  const fetchSec = useServerFn(getSecOverview);
  const fetchOms = useServerFn(getOmsKpis);
  const fetchState = useServerFn(getCommandCenterState);
  const fetchRisk = useServerFn(getRiskBoard);
  const fetchIntegrations = useServerFn(getIntegrationsOverview);
  const fetchExecKpis = useServerFn(getExecKpis);
  const fetchMaint = useServerFn(getMaintSummary);
  const fetchProjects = useServerFn(getProjectsSummary);

  const sec = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchSec(),
    enabled: !authLoading,
    refetchInterval: 30_000,
  });
  const oms = useQuery({
    queryKey: ["home-oms-kpis"],
    queryFn: () => fetchOms(),
    enabled: !authLoading,
    staleTime: 60_000,
  });
  const state = useQuery({
    queryKey: ["blueprint-state"],
    queryFn: () => fetchState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const risk = useQuery({
    queryKey: ["blueprint-risk-board"],
    queryFn: () => fetchRisk(),
    enabled: !authLoading,
    staleTime: 60_000,
  });
  const integrations = useQuery({
    queryKey: ["home-integrations-overview"],
    queryFn: () => fetchIntegrations(),
    enabled: !authLoading,
    staleTime: 60_000,
  });
  /**
   * مؤشرات اللوحة التنفيذية — الكاميرات المتصلة من إجماليها، وصحّة المراقبة
   * والدخول، والحسّاسات في الإنذار، وإنجاز نقاط التفتيش. مفتاحٌ واحد يقرؤه
   * صفّ المؤشرات وبطاقة الخريطة وحالة الأنظمة معًا.
   */
  const execKpis = useQuery({
    queryKey: ["home-exec-kpis"],
    queryFn: () => fetchExecKpis(),
    enabled: !authLoading,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  /**
   * ملخّص الصيانة — بيانات تشغيلية حقيقية بلا محاكاة (`/sec/maintenance`،
   * قرار المالك ٢٠٢٦/١٠/٠٦). حين لا تجيب القاعدة يعود ملخّص نسخة تصدير SAP PM
   * موسومًا `source: "export"` (قرار ٢٠٢٦/١٠/١٨) — و`liveOf.maint` لا يعدّه حيًّا؛
   * وبعد نافذة القراءة العامة خطأٌ عربي بإعادة محاولة. ولا إعادة صامتة.
   */
  const maint = useQuery({
    queryKey: ["home-maint-summary"],
    queryFn: () => fetchMaint(),
    enabled: !authLoading,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  });
  /**
   * ملخّص المشاريع — عدّادات فقط، لا اسم ولا مدير (SEC-01) — لشريط الرئيسية
   * (أمر المالك ٢٠٢٦/١٠/٢٤). حيٌّ من `sec_projects` أو تصدير «Projects Data»
   * المعتمد (`source: "export"`)، بلا محاكاة؛ فلا بديل صامت: `retry: false`
   * والإعادة بيد المستخدم (البند ③ أعلاه).
   */
  const projects = useQuery({
    queryKey: ["home-projects-summary"],
    queryFn: () => fetchProjects(),
    enabled: !authLoading,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  });
  return { sec, oms, state, risk, integrations, execKpis, maint, projects };
}

/** شكل القراءات كما تستهلكه البطاقات — يُشتقّ من الهوك فلا يُكتب مرّتين. */
export type HomeReads = ReturnType<typeof useHomeReads>;
