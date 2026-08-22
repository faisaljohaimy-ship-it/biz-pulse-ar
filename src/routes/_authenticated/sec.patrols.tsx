import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import {
  getSecOverview,
  getTwinTree,
  type SecPatrol,
  type SecPatrolTeam,
} from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, SecLoading, SecError, statusClass } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";
import { LiveStatus } from "@/components/state/LiveStatus";
import {
  Activity,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  OctagonAlert,
  Radio,
  Route as RouteIcon,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/patrols")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Patrols,
});

/**
 * توجيه المالك ٢٠٢٦/٠٨/٢٠: بيانات الدوريات تُعرض بطاقاتٍ تحمل
 * (اسم/كود الدورية · أعضاء الدورية · طريقة التواصل · الموقع التقريبي).
 *
 * سبب الشاشة الفارغة التي رآها المالك («٠ دورية مسجلة»): محاكاة
 * `getSecOverview` لا تنهض إلا حين تفرغ المواقع والبلاغات والدوريات
 * والأصول معًا — فقاعدة فيها صفوف حية في أي جدول آخر وصفر دورية تُرجع
 * قائمة دوريات فارغة، خرقًا لعقيدة «بيانات لا تفرغ». العلاج بنمط
 * enterprise-domains نفسه: القائمة الفارغة بعد اكتمال الجلب تُنهض
 * المراجع المدمجة في الصفحة — وصفوف القاعدة الحيّة تفوز دائمًا متى وصلت.
 */

const M = 60_000;
const H = 3_600_000;
const iso = (t: number) => new Date(t).toISOString();

/**
 * المراجع المدمجة — نسخة طبق الأصل من صفوف `PAT` في
 * `buildSecOverviewSimulation` (showcase-simulation.server.ts) كي تحكي كل
 * الشاشات القصة نفسها: الفِرَق نفسها تظهر في التوأم الرقمي وغرفة العمليات.
 */
function buildReferencePatrols(now: number): SecPatrol[] {
  return [
    {
      id: "sim-pt1",
      ref: "PTR-88",
      site_id: "sim-s1",
      team: "فريق الصقر",
      route: "المحيط الغربي",
      status: "active",
      checkpoints_total: 14,
      checkpoints_done: 9,
      started_at: iso(now - 50 * M),
      ended_at: null,
    },
    {
      id: "sim-pt2",
      ref: "PTR-87",
      site_id: "sim-s2",
      team: "فريق النمر",
      route: "الحلقة الداخلية",
      status: "active",
      checkpoints_total: 10,
      checkpoints_done: 4,
      started_at: iso(now - 25 * M),
      ended_at: null,
    },
    {
      id: "sim-pt3",
      ref: "PTR-86",
      site_id: "sim-s3",
      team: "فريق العقاب",
      route: "المحيط الشمالي",
      status: "completed",
      checkpoints_total: 14,
      checkpoints_done: 14,
      started_at: iso(now - 4 * H),
      ended_at: iso(now - 3 * H),
    },
    {
      id: "sim-pt4",
      ref: "PTR-85",
      site_id: "sim-s4",
      team: "فريق الصقر",
      route: "بوابات الجنوب",
      status: "completed",
      checkpoints_total: 8,
      checkpoints_done: 8,
      started_at: iso(now - 7 * H),
      ended_at: iso(now - 6 * H),
    },
  ];
}

/**
 * أسماء مواقع المراجع المدمجة — تطابق `SITES` في محاكاة الخادم حرفيًا.
 * تلزم حين تنهض مراجع الصفحة وحدها: مواقع النظرة العامة حينها حيّة
 * فلا يحلّ `sim-s*` من خريطتها.
 */
const REFERENCE_SITE_LABELS: Record<string, string> = {
  "sim-s1": "محطة التحويل الغربية (WST-01)",
  "sim-s2": "مبنى القيادة المركزي (CTR-01)",
  "sim-s3": "برج الاتصالات الشرقي (EST-02)",
  "sim-s4": "خزان المياه الجنوبي (STH-01)",
};

/**
 * حالة الدورية كلمةً عربية وشكلًا لا لونًا وحده (WCAG 2.2 §1.4.1 وعرف
 * لوحات السلامة في sec-shell): دائرة نشاط = جارية · ساعة = مجدولة ·
 * دائرة صح = مكتملة · مثمّن = فائتة.
 */
const STATUS_VIEW: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  active: { label: "نشطة", icon: Activity },
  scheduled: { label: "مجدولة", icon: Clock },
  completed: { label: "مكتملة", icon: CheckCircle2 },
  missed: { label: "فائتة", icon: OctagonAlert },
};

/** جمع عربي سليم لعدد الأفراد. */
function membersCountLabel(n: number) {
  if (n === 1) return "فرد واحد";
  if (n === 2) return "فردان";
  if (n >= 3 && n <= 10) return `${n} أفراد`;
  return `${n} فردًا`;
}

function Patrols() {
  const { user, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getSecOverview);
  const fetchTwin = useServerFn(getTwinTree);
  // البوابة الوحيدة `!authLoading` — لا `enabled: !!user` على قراءة عرض.
  const overviewQ = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !authLoading,
  });
  // شجرة التوأم — مفتاح `sec-twin` نفسه المستخدم في /sec/twin فيتشارك
  // المخزّن. منها فرق الدوريات `sec_patrol_teams` (القائد وعدد الأفراد
  // والمركبة) — أغنى نموذج دوريات في المخطط، ولها محاكاتها المرنة خادميًا.
  const twinQ = useQuery({
    queryKey: ["sec-twin"],
    queryFn: () => fetchTwin(),
    enabled: !authLoading,
  });

  // فرق الدوريات باسمها العربي — صف الدورية يحمل اسم الفريق نصًا (team)
  // ولا مفتاح أجنبيًا له، فالمطابقة بالاسم كما تتطابق أسماء المحاكاتين.
  const teamsByName = useMemo(() => {
    const m = new Map<string, SecPatrolTeam & { circle_name: string }>();
    for (const c of twinQ.data?.circles ?? [])
      for (const t of c.patrol_teams) m.set(t.name_ar, { ...t, circle_name: c.name_ar });
    return m;
  }, [twinQ.data]);

  const siteLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of overviewQ.data?.sites ?? []) m.set(s.id, `${s.name_ar} (${s.code})`);
    return m;
  }, [overviewQ.data]);

  const referencePatrols = useMemo(() => buildReferencePatrols(Date.now()), []);
  const fetched = overviewQ.data?.patrols ?? [];
  // «بيانات لا تفرغ»: الجلب اكتمل والقائمة فارغة ⇐ تنهض المراجع المدمجة.
  const rows = overviewQ.data && fetched.length === 0 ? referencePatrols : fetched;
  const activeCount = rows.filter((r) => r.status === "active").length;

  if (overviewQ.isLoading) return <SecLoading rows={6} />;
  if (overviewQ.isError && !overviewQ.data)
    return <SecError onRetry={() => void overviewQ.refetch()} />;

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="الدوريات الأمنية"
        subtitle={`${rows.length} دورية مسجّلة · ${activeCount} نشطة الآن`}
      >
        <SecLiveBadge
          dataUpdatedAt={overviewQ.dataUpdatedAt}
          isFetching={overviewQ.isFetching}
          source="sec_patrols"
        />
      </SecPageHeader>

      {rows.length === 0 ? (
        // نادرة بعد نهوض المراجع — تبقى حارسًا لا يترك الشاشة بلا كلمة.
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <LiveStatus variant="monitoring" hint="جدول الدوريات جاهز — لا دوريات مسجّلة" size="sm" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <PatrolCard
              key={p.id}
              patrol={p}
              team={teamsByName.get(p.team)}
              siteLabel={
                p.site_id
                  ? (siteLabelById.get(p.site_id) ?? REFERENCE_SITE_LABELS[p.site_id] ?? null)
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PatrolCard({
  patrol: p,
  team,
  siteLabel,
}: {
  patrol: SecPatrol;
  team: (SecPatrolTeam & { circle_name: string }) | undefined;
  siteLabel: string | null;
}) {
  const sv = STATUS_VIEW[p.status];
  const StatusIcon = sv?.icon;
  const pct =
    p.checkpoints_total > 0 ? Math.round((p.checkpoints_done / p.checkpoints_total) * 100) : null;

  // أعضاء الدورية من `sec_patrol_teams` (القائد + العدد). عدّاد صفري بلا
  // قائد قيمة افتراضية لم تُملأ لا قياس — فتُعرض «غير مسجّل» (المادة ٢٧).
  const members =
    team && (team.leader || team.members_count > 0)
      ? [team.leader ? `القائد: ${team.leader}` : null, membersCountLabel(team.members_count)]
          .filter(Boolean)
          .join(" · ")
      : null;

  // الموقع التقريبي: موقع الجولة من `sec_sites`، وإلا دائرة الفريق من
  // شجرة التوأم — وإلا «غير مسجّل» بلا اختلاق.
  const location = siteLabel ?? (team ? `${team.circle_name} (${team.code})` : null);

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* اسم / كود الدورية */}
          <h2 className="truncate text-sm font-bold text-foreground">{p.team}</h2>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground" dir="ltr">
            {p.ref}
            {team ? ` · ${team.code}` : ""}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium ${statusClass(p.status)}`}
        >
          {StatusIcon && <StatusIcon aria-hidden className="h-3 w-3" />}
          {sv?.label ?? p.status}
        </span>
      </div>

      <dl className="mt-3 space-y-2.5">
        <CardField icon={Users} label="أعضاء الدورية" value={members} missingLabel="غير مسجّل" />
        {/* طريقة التواصل: لا حقل اتصال (قناة لاسلكي/هاتف) في `sec_patrols`
            ولا `sec_patrol_teams` ولا في المحاكاة — تُعرض «غير مسجّلة»
            ولا تُختلق قيمة (المادة ٢٧). */}
        <CardField icon={Radio} label="طريقة التواصل" value={null} missingLabel="غير مسجّلة" />
        <CardField
          icon={MapPin}
          label="الموقع التقريبي"
          value={location}
          missingLabel="غير مسجّل"
        />
        <CardField icon={RouteIcon} label="مسار الجولة" value={p.route} missingLabel="غير مسجّل" />
        {team?.vehicle_plate && (
          <CardField icon={Car} label="مركبة الدورية" value={team.vehicle_plate} missingLabel="" />
        )}
      </dl>

      {/* تقدّم نقاط التفتيش — يبقى لقيمته التشغيلية؛ مقام صفري = لم تُسجَّل
          نقاط، لا «0%» مُختلق. */}
      {pct === null ? (
        <div className="mt-3 text-[12px] text-muted-foreground">نقاط التفتيش: غير مسجّلة</div>
      ) : (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[12px] text-muted-foreground">
            <span>
              {p.checkpoints_done}/{p.checkpoints_total} نقاط
            </span>
            <span>{pct}%</span>
          </div>
        </>
      )}
    </article>
  );
}

function CardField({
  icon: Icon,
  label,
  value,
  missingLabel,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string | null;
  missingLabel: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-sm">
        <dt className="text-[11px] font-medium tracking-wide text-muted-foreground">{label}</dt>
        <dd className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ?? missingLabel}
        </dd>
      </div>
    </div>
  );
}
