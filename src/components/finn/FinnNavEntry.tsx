/**
 * مدخل «فِن» في الشريط الجانبي — **يظهر للمالك وحده، والحكم من الخادم.**
 *
 * يسأل `getFinnAccess` (دالة خادم خفيفة تعيد `{ allowed }`)، ويُرسم الرابط **فقط**
 * إن كان الجواب «نعم». للزائر لا يُنادى الخادم أصلًا (لا جلسة ⇒ لا مالك)، ولغير
 * المالك المسجَّل يعود `{ allowed: false }` فلا يُرسم شيء ولا يتحمّل من الواجهة
 * شيئًا: هذا المكوّن لا يستورد الصفحة ولا الموجِّه ولا المحادثة — الصفحة مسارٌ
 * كسول يحمّله الموجِّه عند الفتح وحده.
 *
 * وهذا **راحةٌ لا حماية**: الحماية في المسار البرمجي (404 لغير المالك) وفي الصفحة
 * (notFound). والفشل (شبكة · جلسة) يُخفي المدخل بصمت — لا يكسر الشريط.
 *
 * الأنماط (`row/idle/active`) يمرّرها الشريط نفسه فيطابق المدخل أخواته بلا نسخةٍ
 * ثانية من الأصناف.
 */
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFinnAccess } from "@/lib/finn-agent/access.functions";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { FINN_NAV_ENTRY } from "@/lib/nav/owner-nav";
import { screenNameAr, screenNameEn } from "@/lib/nav/screen-names";

type NavClasses = { readonly row: string; readonly idle: string; readonly active: string };

function FinnNavLink({
  userId,
  classes,
  textDir,
  onNavigate,
}: {
  userId: string;
  classes: NavClasses;
  textDir: "rtl" | "ltr";
  onNavigate?: () => void;
}) {
  const { locale } = useI18n();
  const { pathname } = useLocation();
  const { data } = useQuery({
    queryKey: ["finn-access", userId],
    queryFn: () => getFinnAccess(),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (!data?.allowed) return null;

  const Icon = FINN_NAV_ENTRY.icon;
  const active = pathname === FINN_NAV_ENTRY.to || pathname.startsWith(`${FINN_NAV_ENTRY.to}/`);
  const label = locale === "ar" ? screenNameAr(FINN_NAV_ENTRY.to) : screenNameEn(FINN_NAV_ENTRY.to);
  return (
    <Link
      to={FINN_NAV_ENTRY.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${classes.row} ${active ? classes.active : classes.idle}`}
      data-nav-id={FINN_NAV_ENTRY.id}
    >
      <Icon aria-hidden className="nx-sysnav-ico size-5 shrink-0" />
      <span dir={textDir} className="nx-sysnav-label min-w-0 flex-1 truncate">
        {label}
      </span>
    </Link>
  );
}

export function FinnNavEntry(props: {
  classes: NavClasses;
  textDir: "rtl" | "ltr";
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  // لا جلسة ⇒ لا مالك ⇒ لا نداء للخادم.
  if (!user) return null;
  return <FinnNavLink userId={user.id} {...props} />;
}
