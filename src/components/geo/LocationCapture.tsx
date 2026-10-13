/**
 * تحديد موقع المُبلِّغ بدقّة — خرائط Google (أمر المالك ٢٠٢٦/٠٩/٢٩: «اربط
 * قوقل ماب بموقع المستخدم ليحدد موقعه بالضبط عند البلاغات»).
 *
 * **الإذن قبل الموقع، والموقع بالزرّ وحده.** لا يُطلب الموقع عند فتح النموذج:
 * المستخدم يضغط «حدّد موقعي» فيطلب المتصفح إذنه، ولا يُرسَل شيء قبل ذلك. وما
 * يُرفض يُقال بالعربية ولا يمنع إرسال البلاغ — الموقع إضافةٌ لا شرط.
 *
 * **بلا مفتاح.** المعاينة إطار «التضمين» العام لخرائط Google والرابط «Maps
 * URLs» الرسمي (`/maps/search/?api=1`) — كلاهما لا يحتاج مفتاح API، فلا سرّ
 * في العميل ولا في المستودع (ثابت «لا مفاتيح في العميل»).
 *
 * **ولا يصل الموقع إلى Google إلا بضغطةٍ ثانية صريحة** (المادة ٩، PDPL).
 * كان الإطار يُحمَّل فور التحديد فيخرج الإحداثيان الدقيقان إلى طرفٍ ثالث قبل
 * أي إرسال — ومعهما عنوان الصفحة في `Referer` — والإفصاح يقول «يُحفظ مع هذا
 * البلاغ وحده» (قاسه حارس الجودة). فالمعاينة زرٌّ يُقال بجانبه إنه يُرسل
 * الإحداثيين إلى Google، والإطار بلا مُحيل (`no-referrer`).
 *
 * **الدقّة تُقال لا تُدّعى:** `accuracy` من المتصفح بالأمتار يُعرض كما هو
 * (±م)، وحين تتجاوز ١٠٠م يُنبَّه أن الموقع تقريبي — شبكةٌ لا GPS.
 */
import { useCallback, useState } from "react";
import { Crosshair, ExternalLink, LoaderCircle, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CapturedLocation {
  readonly lat: number;
  readonly lng: number;
  /** نصف قطر الثقة بالأمتار كما يعطيه المتصفح. */
  readonly accuracy_m: number;
  readonly captured_at: string;
}

type Status = { kind: "idle" } | { kind: "locating" } | { kind: "error"; message: string };

const ERRORS: Record<number, string> = {
  1: "رُفض إذن الموقع. فعّله من إعدادات المتصفح ثم أعد المحاولة، أو أرسل البلاغ دون موقع.",
  2: "تعذّر تحديد الموقع الآن — تأكّد من تشغيل خدمات الموقع في الجهاز.",
  3: "انتهت مهلة تحديد الموقع. أعد المحاولة في مكانٍ مكشوف.",
};

/** رابط خرائط Google الرسمي لإحداثي — بلا مفتاح. */
export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
}

/** إطار التضمين العام — بلا مفتاح. */
export function googleMapsEmbed(lat: number, lng: number): string {
  return `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}&z=17&output=embed`;
}

export function LocationCapture({
  value,
  onChange,
}: {
  value: CapturedLocation | null;
  onChange: (v: CapturedLocation | null) => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  /** المعاينة بإذنٍ ثانٍ صريح — لا تُحمَّل مع التحديد. */
  const [preview, setPreview] = useState(false);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus({ kind: "error", message: "المتصفح لا يدعم تحديد الموقع." });
      return;
    }
    setStatus({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy_m: Math.round(pos.coords.accuracy),
          captured_at: new Date(pos.timestamp).toISOString(),
        });
        setStatus({ kind: "idle" });
      },
      (err) =>
        setStatus({
          kind: "error",
          message: ERRORS[err.code] ?? "تعذّر تحديد الموقع.",
        }),
      // أعلى دقّة ممكنة، ولا موقعَ مخزَّنًا قديمًا: البلاغ عن «الآن وهنا».
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }, [onChange]);

  return (
    <div className="grid gap-2">
      {!value ? (
        <Button
          type="button"
          variant="outline"
          onClick={locate}
          disabled={status.kind === "locating"}
          className="nx-focus-ring min-h-11 justify-start gap-2"
        >
          {status.kind === "locating" ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <Crosshair aria-hidden className="size-4" />
          )}
          {status.kind === "locating" ? "جارٍ تحديد موقعك…" : "حدّد موقعي بدقّة"}
        </Button>
      ) : (
        <div className="grid gap-2 rounded-xl border p-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span className="flex items-center gap-1.5 font-semibold">
              <MapPin aria-hidden className="size-4 shrink-0" />
              <span dir="ltr" className="tabular-nums">
                {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
              </span>
              <span className="text-muted-foreground">
                (±{value.accuracy_m.toLocaleString("ar-SA")} م)
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview(false);
                onChange(null);
              }}
              className="nx-focus-ring min-h-11 gap-1"
            >
              <X aria-hidden className="size-4" />
              إزالة الموقع
            </Button>
          </div>
          {value.accuracy_m > 100 && (
            <p className="text-[12px] text-muted-foreground">
              الموقع تقريبي (دقّته أكثر من ١٠٠م) — غالبًا من الشبكة لا من GPS.
            </p>
          )}
          {preview ? (
            <iframe
              title="موقع البلاغ على خرائط Google"
              src={googleMapsEmbed(value.lat, value.lng)}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-44 w-full rounded-lg border-0"
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreview(true)}
              className="nx-focus-ring min-h-11 justify-start gap-2"
            >
              <MapPin aria-hidden className="size-4" />
              اعرض على خرائط Google
            </Button>
          )}
          <p className="text-[12px] text-muted-foreground">
            عرض الخريطة أو فتح الرابط يُرسل الإحداثيين إلى Google.
          </p>
          <a
            href={googleMapsLink(value.lat, value.lng)}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="nx-focus-ring inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-primary"
          >
            <ExternalLink aria-hidden className="size-4" />
            افتح في خرائط Google
          </a>
        </div>
      )}
      {status.kind === "error" && (
        <p role="alert" className="text-[12px] text-muted-foreground">
          {status.message}
        </p>
      )}
      <p className="text-[12px] text-muted-foreground">
        لا يُؤخذ موقعك إلا حين تضغط الزرّ، ويُحفظ مع سجلّ هذا البلاغ. ولا يصل إلى Google إلا إن
        عرضتَ الخريطة أو فتحتَ الرابط.
      </p>
    </div>
  );
}

/**
 * قراءة الموقع المحفوظ من حمولة حدث التسجيل — الحمولة تأتي من القاعدة فلا
 * يُفترض شكلها: رقمان في نطاقيهما وإلا لا موقع (لا إحداثي مصنوع من غياب).
 */
export function readReportedLocation(payload: unknown): CapturedLocation | null {
  const loc = (payload as { location?: unknown } | null | undefined)?.location as
    Partial<CapturedLocation> | null | undefined;
  if (!loc) return null;
  const { lat, lng, accuracy_m, captured_at } = loc;
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  return {
    lat,
    lng,
    accuracy_m:
      typeof accuracy_m === "number" && Number.isFinite(accuracy_m) && accuracy_m >= 0
        ? accuracy_m
        : Number.NaN,
    captured_at: typeof captured_at === "string" ? captured_at : "",
  };
}

/** الموقع المحفوظ مع البلاغ — في تفاصيله. رابطٌ لا إطار: لا حِمل بلا طلب. */
export function ReportedLocation({ location }: { location: CapturedLocation }) {
  return (
    <div className="grid gap-1 rounded-xl border p-3 text-[13px]">
      <span className="flex flex-wrap items-center gap-1.5 font-semibold">
        <MapPin aria-hidden className="size-4 shrink-0" />
        موقع المُبلِّغ عند التسجيل
      </span>
      <span dir="ltr" className="tabular-nums text-muted-foreground">
        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        {Number.isFinite(location.accuracy_m) && ` (±${Math.round(location.accuracy_m)} m)`}
      </span>
      <a
        href={googleMapsLink(location.lat, location.lng)}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className="nx-focus-ring inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary"
      >
        <ExternalLink aria-hidden className="size-4" />
        افتح في خرائط Google
      </a>
    </div>
  );
}
