/**
 * قائمة الحساب — بطاقة المستخدم في الترويسة تفتحها، في كل صفحة وعلى كل عرض.
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ («بنفس تخطيط وهيئة الصفحة الرئيسية») نقل الصفحات
 * الداخلية إلى قشرة الرئيسية، والقشرة القديمة كانت تحمل في شريطها ما لا تحمله
 * الرئيسية: مبدّل اللغة، ومبدّل المنطقة، ومبدّل المؤسسة. **ولا يسقط شيءٌ منها**
 * — تجتمع هنا خلف البطاقة نفسها، بصفوفٍ ≥ 44px، على المكتب والجوال معًا (على
 * الجوال تبقى الصورة الرمزية وحدها ظاهرةً وهي الزرّ نفسه). والإعدادات التي كانت
 * وجهة البطاقة صارت صفًّا فيها.
 *
 *   • **اللغة**: «العربية / English» — زرّان بحالةٍ معلنة (`aria-pressed`).
 *   • **المنطقة**: المناطق الأربع من `REGIONS` وحدها، ولونها متغيّرٌ يُمرَّر
 *     (`--region-tint`، المادة ٣٤ §٣) لا قيمةٌ نهائية. والاختيار يضبط المنطقة
 *     الفاعلة وينتقل إلى `/sec` — سلوك المبدّل القديم نفسه.
 *   • **المؤسسة**: `OrgSwitcher` نفسه، لأعضاء المؤسسات وحدهم (الزائر بلا عضوية
 *     فلا يُرسم القسم — كما كان المبدّل يُرسم فارغًا له).
 *   • **الإعدادات** ← `/settings`.
 *
 * **لا اسمٌ مخترَع ولا دورٌ مخترَع** (المواصفة §3.11، N4): الزائر «زائر» /
 * «زائر النظام»؛ والمسجَّل اسمه الأول ودوره في مؤسسته الحالية — من عضويته
 * (`listMyOrgs`، المفتاح نفسه الذي يقرؤه مبدّل المؤسسة فلا طلبان) — وإلا سقط
 * سطر الدور ولم يُخمَّن. والنقطة الخضراء حضور الجلسة المفتوحة على هذه الشاشة.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Check, Settings, UserRound } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useRegion } from "@/lib/region-context";
import { REGION_ACCENT_HEX } from "@/lib/regions";
import { listMyOrgs, type OrgRole } from "@/lib/org/org.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OrgSwitcher } from "@/components/org/org-switcher";
import "@/styles/home/home-chrome.css";

/** دور العضوية بلسانيه — من مصدرٍ حقيقي وحده (`org_members.role`). */
const ROLE_LABEL: Record<OrgRole, { ar: string; en: string }> = {
  owner: { ar: "مالك المؤسسة", en: "Organization owner" },
  admin: { ar: "مسؤول النظام", en: "Administrator" },
  manager: { ar: "مدير", en: "Manager" },
  operator: { ar: "مشغّل", en: "Operator" },
  viewer: { ar: "مشاهد", en: "Viewer" },
};

/** البادئات التي لا تقوم اسمًا وحدها: «عبد الله» اسمٌ أوّل واحد لا «عبد». */
const NAME_PREFIXES: ReadonlySet<string> = new Set(["عبد", "ابو", "أبو"]);

/**
 * الاسم الأول لصاحب الجلسة وحده (قرار المالك N4) — من اسمه في حسابه، لا من
 * بريده ولا من اسم غيره. وبلا اسمٍ في الحساب لا يُختلق اسم: «حسابي».
 */
function firstNameOf(fullName: string | undefined | null): string | null {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (NAME_PREFIXES.has(parts[0]) && parts[1]) return `${parts[0]} ${parts[1]}`;
  return parts[0];
}

/** صفّ القائمة: هدف لمسٍ ≥ 44px وحلقة تركيزٍ ظاهرة (`.nx-focus-ring`). */
const ROW = "nx-acct-row nx-focus-ring";

export function AccountMenu({ ar }: { ar: boolean }) {
  const { locale, setLocale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { regionId, regions, setRegion } = useRegion();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ids = useId();

  const meta = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const fetchOrgs = useServerFn(listMyOrgs);
  // قراءة حساب صاحب الجلسة لا قراءة عرض: الزائر لا عضوية له فلا تُطلب.
  const { data: orgs } = useQuery({
    queryKey: ["my-orgs", user?.id ?? "anon"],
    queryFn: () => fetchOrgs(),
    staleTime: 60_000,
    enabled: !authLoading && user != null,
  });
  const membership = orgs?.find((o) => o.is_current) ?? orgs?.[0];
  const roleLabel = membership ? ROLE_LABEL[membership.role] : undefined;
  const isMember = (orgs?.length ?? 0) > 0;

  const first = firstNameOf(meta.full_name || meta.name);
  const name = user ? (first ?? (ar ? "حسابي" : "My account")) : ar ? "زائر" : "Guest";
  const role = user
    ? roleLabel
      ? ar
        ? roleLabel.ar
        : roleLabel.en
      : null
    : ar
      ? "زائر النظام"
      : "System guest";
  // الاسم المقروء يبدأ بالنصّ المرئي بترتيبه (WCAG 2.5.3)، ثم ما يفعله الزرّ.
  const label = [name, role, ar ? "قائمة الحساب" : "Account menu"].filter(Boolean).join(" — ");
  const initial = first?.charAt(0);

  const avatar = (
    <span className="nx-hdr-avatar" aria-hidden>
      {user && meta.avatar_url ? (
        <img src={meta.avatar_url} alt="" width={46} height={46} className="nx-hdr-avatar-img" />
      ) : user && initial ? (
        <span className="nx-hdr-avatar-initial">{initial}</span>
      ) : (
        <UserRound className="nx-hdr-avatar-glyph" />
      )}
      <span className="nx-hdr-presence" />
    </span>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          dir={ar ? "rtl" : "ltr"}
          className="nx-focus-ring nx-hdr-user flex min-w-0 items-center"
        >
          {avatar}
          <span className="nx-hdr-user-text">
            <span className="nx-hdr-user-name">{name}</span>
            {role ? <span className="nx-hdr-user-role">{role}</span> : null}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        dir={ar ? "rtl" : "ltr"}
        aria-label={ar ? "قائمة الحساب" : "Account menu"}
        className="nx-acct w-[min(20rem,calc(100vw-1.5rem))] p-2"
      >
        {/* من أنت — الاسم والدور كما في البطاقة (على الجوال لا يظهران إلا هنا). */}
        <div className="nx-acct-who">
          {avatar}
          <div className="min-w-0">
            <p className="nx-acct-name">{name}</p>
            {role ? <p className="nx-acct-role">{role}</p> : null}
          </div>
        </div>

        {/* اللغة — العربية أولًا. */}
        <div role="group" aria-labelledby={`${ids}-lang`} className="nx-acct-section">
          <p id={`${ids}-lang`} className="nx-acct-title">
            {ar ? "اللغة" : "Language"}
          </p>
          <div className="nx-acct-seg">
            <button
              type="button"
              lang="ar"
              aria-pressed={locale === "ar"}
              onClick={() => setLocale("ar")}
              className={ROW}
            >
              العربية
            </button>
            <button
              type="button"
              lang="en"
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
              className={ROW}
            >
              English
            </button>
          </div>
        </div>

        {/* المنطقة — المناطق الأربع من `REGIONS`، ولونها متغيّرٌ يُمرَّر. */}
        <div role="group" aria-labelledby={`${ids}-region`} className="nx-acct-section">
          <p id={`${ids}-region`} className="nx-acct-title">
            {ar ? "المنطقة" : "Region"}
          </p>
          <ul className="nx-acct-list">
            {regions.map((r) => {
              const active = r.id === regionId;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setRegion(r.id);
                      setOpen(false);
                      void navigate({ to: "/sec" });
                    }}
                    className={cn(ROW, active && "nx-acct-row--active")}
                    style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[r.id] }}
                  >
                    <span aria-hidden className="nx-acct-dot" />
                    <span className="min-w-0 flex-1 truncate">{ar ? r.shortAr : r.shortEn}</span>
                    {active && <Check aria-hidden className="nx-acct-check" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* المؤسسة — للأعضاء وحدهم؛ المبدّل نفسه بقائمته ومفتاح قراءته. */}
        {isMember && (
          <div role="group" aria-labelledby={`${ids}-org`} className="nx-acct-section">
            <p id={`${ids}-org`} className="nx-acct-title">
              {ar ? "المؤسسة" : "Organization"}
            </p>
            <div className="nx-acct-org">
              <OrgSwitcher />
            </div>
          </div>
        )}

        <div className="nx-acct-section">
          <Link to="/settings" onClick={() => setOpen(false)} className={ROW}>
            <Settings aria-hidden className="nx-acct-ico" />
            <span className="min-w-0 flex-1 truncate">{ar ? "الإعدادات" : "Settings"}</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
