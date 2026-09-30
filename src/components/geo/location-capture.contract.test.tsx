/**
 * عقد موقع المُبلِّغ (أمر المالك ٢٠٢٦/٠٩/٢٩ — «اربط قوقل ماب بموقع المستخدم
 * ليحدد موقعه بالضبط عند البلاغات»).
 *
 * أربعة أشياء يسهل كسرها بلا أن يسقط بناء: رأسٌ يعيد حجب الموقع فيصير الزرّ
 * ميتًا صامتًا، أو يفتحه لكل أصلٍ مضمَّن (`*`)؛ وطلبُ الموقع عند فتح النموذج
 * لا عند الضغط؛ ومفتاح API يتسلّل إلى رابط الخرائط؛ وحمولةٌ من القاعدة تُقرأ
 * إحداثيًّا بلا تحقّق.
 */
import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LocationCapture,
  googleMapsEmbed,
  googleMapsLink,
  readReportedLocation,
} from "@/components/geo/LocationCapture";

const policy = (src: string) => src.match(/camera=\(\)[^"]*/)?.[0] ?? "";

describe("رأس الأذونات — الموقع للأصل وحده", () => {
  // المصدر الوحيد الفعّال `src/start.ts`: Vercel معطَّل و`vercel.json` لا يُمسّ
  // (مهارة nexios-deploy-safety) — فلا يُشترط تطابقهما.
  const START = readFileSync("src/start.ts", "utf8");

  it("`geolocation=(self)` لا لكل أصل، والكاميرا مغلقة", () => {
    expect(policy(START)).toContain("geolocation=(self)");
    expect(policy(START), "مفتوحٌ لكل أصل").not.toMatch(/geolocation=\*/);
    expect(policy(START), "الكاميرا فُتحت معه").toContain("camera=()");
  });
});

describe("الموقع بالزرّ وحده، وبأعلى دقّة", () => {
  const SRC = readFileSync("src/components/geo/LocationCapture.tsx", "utf8");

  it("لا طلب موقعٍ عند الفتح، ولا موقعٌ مخزَّن قديم", () => {
    expect(SRC, "طلب الموقع في أثرٍ جانبي لا في ضغطة").not.toMatch(/useEffect/);
    expect(SRC).toContain("enableHighAccuracy: true");
    expect(SRC).toContain("maximumAge: 0");
  });

  it("روابط خرائط Google بلا مفتاح", () => {
    const link = googleMapsLink(24.7136, 46.6753);
    const embed = googleMapsEmbed(24.7136, 46.6753);
    expect(link).toBe("https://www.google.com/maps/search/?api=1&query=24.713600%2C46.675300");
    expect(embed).toContain("output=embed");
    for (const u of [link, embed]) expect(u).not.toMatch(/key=|AIza/);
    expect(SRC).not.toMatch(/AIza[0-9A-Za-z_-]{10,}/);
    expect(SRC, "مُحيلٌ يكشف عنوان الصفحة لـGoogle").not.toContain("no-referrer-when-downgrade");
    expect(SRC, "الإفصاح القديم عاد").not.toContain("هذا البلاغ وحده");
  });
});

describe("السلوك — بمحاكاة `navigator.geolocation`", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");
  afterEach(() => {
    if (original) Object.defineProperty(navigator, "geolocation", original);
    else delete (navigator as { geolocation?: unknown }).geolocation;
  });
  const mockGeo = (impl: (ok: PositionCallback, fail: PositionErrorCallback) => void) =>
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: vi.fn(impl) },
    });

  it("الضغط يطلب الموقع ويسلّمه بدقّته", () => {
    const onChange = vi.fn();
    mockGeo((ok) =>
      ok({
        coords: { latitude: 21.4858, longitude: 39.1925, accuracy: 7.6 },
        timestamp: Date.UTC(2026, 8, 29, 12),
      } as GeolocationPosition),
    );
    render(<LocationCapture value={null} onChange={onChange} />);
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /حدّد موقعي/ }));
    expect(onChange).toHaveBeenCalledWith({
      lat: 21.4858,
      lng: 39.1925,
      accuracy_m: 8,
      captured_at: "2026-09-29T12:00:00.000Z",
    });
  });

  it("الرفض يُقال بالعربية ولا يُسجَّل موقع", () => {
    const onChange = vi.fn();
    mockGeo((_ok, fail) => fail({ code: 1 } as GeolocationPositionError));
    render(<LocationCapture value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /حدّد موقعي/ }));
    expect(screen.getByRole("alert").textContent).toContain("رُفض إذن الموقع");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("لا شيء يخرج إلى Google قبل ضغطةٍ ثانية صريحة (PDPL)", () => {
    // كان الإطار يُحمَّل فور التحديد — قاسه حارس الجودة: طلبٌ إلى
    // maps.google.com بالإحداثيين الدقيقين قبل أي إرسال، ومعه `Referer`.
    const onChange = vi.fn();
    render(
      <LocationCapture
        value={{ lat: 24.7, lng: 46.6, accuracy_m: 250, captured_at: "2026-09-29T12:00:00Z" }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByTitle("موقع البلاغ على خرائط Google"), "إطارٌ حُمِّل بلا طلب").toBeNull();
    expect(screen.getByText(/يُرسل الإحداثيين إلى Google/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /اعرض على خرائط Google/ }));
    const frame = screen.getByTitle("موقع البلاغ على خرائط Google");
    expect(frame.getAttribute("src")).toContain("output=embed");
    expect(frame.getAttribute("referrerpolicy")).toBe("no-referrer");
    // الدقّة فوق ١٠٠م تُقال: «تقريبي» لا «بالضبط».
    expect(screen.getByText(/الموقع تقريبي/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /إزالة الموقع/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("قراءة الموقع المحفوظ — الحمولة لا تُصدَّق", () => {
  it("يُقبل الصحيح ويُرفض ما خرج عن النطاق أو لم يكن رقمًا", () => {
    const ok = { location: { lat: 26.42, lng: 50.08, accuracy_m: 12, captured_at: "x" } };
    expect(readReportedLocation(ok)?.lat).toBe(26.42);
    expect(readReportedLocation({ location: { lat: 91, lng: 50 } })).toBeNull();
    expect(readReportedLocation({ location: { lat: "26", lng: 50 } })).toBeNull();
    expect(readReportedLocation({ location: null })).toBeNull();
    expect(readReportedLocation(undefined)).toBeNull();
  });

  it("والخادم يتحقّق من النطاقين ويحفظ في حمولة حدث التسجيل", () => {
    const FN = readFileSync("src/lib/oms.functions.ts", "utf8");
    expect(FN).toMatch(/lat: z\.number\(\)\.finite\(\)\.min\(-90\)\.max\(90\)/);
    expect(FN).toMatch(/lng: z\.number\(\)\.finite\(\)\.min\(-180\)\.max\(180\)/);
    expect(FN).toContain("location: data.location ?? null");
  });
});

describe("مدخلا البلاغ — «الاثنان» بأمر المالك ٢٠٢٦/٠٩/٢٩", () => {
  const HEADER = readFileSync("src/components/nav/SystemHeader.tsx", "utf8");
  const PAGE = readFileSync("src/routes/_authenticated/sec.incidents.tsx", "utf8");
  const DIALOG = readFileSync("src/components/sec/oms-dialogs.tsx", "utf8");

  /** استيرادٌ ساكن للنموذج في الترويسة = حِملٌ في كل صفحة. */
  const staticImport = (src: string) =>
    /^import[^;]*from "@\/components\/sec\/oms-dialogs"/m.test(src);

  it("زرّ «بلّغ» في الترويسة يحمّل النموذج عند الضغط لا مع الصفحة", () => {
    expect(HEADER).toContain("<QuickReport ar={ar} />");
    expect(HEADER).toMatch(/lazy\(\(\) =>\s*import\("@\/components\/sec\/oms-dialogs"\)/);
    expect(staticImport(HEADER), "استيرادٌ ساكن للنموذج").toBe(false);
    // والفحص يرى الاستيراد الساكن حين يكون (المادة ٣٠).
    expect(staticImport('import { NewIncidentDialog } from "@/components/sec/oms-dialogs";')).toBe(
      true,
    );
  });

  it("«بلاغ جديد» عاد إلى رأس صفحة البلاغات", () => {
    expect(PAGE).toContain("<NewIncidentDialog />");
  });

  it("الزائر يُقال له قبل الملء، والإرسال معطَّل بلا حساب", () => {
    expect(DIALOG).toContain('<GuestAccountNote what="تسجيل البلاغ" />');
    expect(DIALOG).toMatch(/disabled=\{!reporter \|\|/);
    expect(DIALOG).toContain("<LocationCapture value={location} onChange={setLocation} />");
  });
});

describe("حلقة التركيز على الترويسة والحقل — لا أدوات ميتة", () => {
  const CSS = readFileSync("src/styles.css", "utf8");
  it("القاعدة خارج الطبقات تشمل أزرار الترويسة وعناصر الموقع", () => {
    const at = CSS.indexOf(".nx-home-kpi:focus-visible,");
    const rule = CSS.slice(at, CSS.indexOf("}", at));
    expect(rule).toContain(".nx-icon-btn:focus-visible");
    expect(rule).toContain(".nx-focus-ring:focus-visible");
    expect(rule).toContain("outline: 2px solid var(--tone-cyan)");
    for (const f of [
      "src/components/nav/SystemHeader.tsx",
      "src/components/geo/LocationCapture.tsx",
    ]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/focus-visible:outline/);
    }
    expect(readFileSync("src/components/nav/SystemHeader.tsx", "utf8")).toMatch(
      /const ICON_BTN =\s*"nx-icon-btn /,
    );
  });
});
