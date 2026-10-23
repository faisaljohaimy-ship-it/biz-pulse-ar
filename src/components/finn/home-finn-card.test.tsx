/**
 * بطاقة «فِن» في الرئيسية — قرار العرض: للمالك وحده، والحكم من الخادم.
 *
 * `getFinnAccess` مُحاكاة؛ ما يُفحص هو **من يرى البطاقة**: لا جلسة ⇒ لا بطاقة ولا نداء،
 * `allowed:false` ⇒ لا بطاقة ولا أثر في الشجرة (فلا يُكشف وجود الوكيل)، فشل الخادم ⇒ تختفي
 * بصمت، `allowed:true` ⇒ بطاقة بصورتها ورابط `/finn` والشريط التحذيري الحرفيّ.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sim = vi.hoisted(() => ({
  user: null as null | { id: string },
  access: vi.fn(),
  locale: "ar" as "ar" | "en",
}));

vi.mock("@/lib/finn-agent/access.functions", () => ({
  getFinnAccess: (...args: unknown[]) => sim.access(...args),
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: sim.user }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: sim.locale }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { HOME_IMAGES, HOME_IMAGES_MAX_BYTES } from "@/components/home/home-images";
import { FINN_BANNER_AR } from "@/lib/finn-agent/copy";
import { HomeFinnCard } from "./HomeFinnCard";

const OWNER = {
  allowed: true,
  engine: { gpt: true, gptModel: "gpt-4.1", fallback: true, paused: false },
};

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HomeFinnCard />
    </QueryClientProvider>,
  );
}

describe("HomeFinnCard — قرار العرض", () => {
  beforeEach(() => {
    sim.user = null;
    sim.locale = "ar";
    sim.access.mockReset();
  });

  it("الزائر بلا جلسة: لا بطاقة ولا نداء للخادم", () => {
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
    expect(sim.access).not.toHaveBeenCalled();
  });

  it("غير المالك المسجَّل: لا بطاقة ولا أثر يكشف الوكيل", async () => {
    sim.user = { id: "u1" };
    sim.access.mockResolvedValue({ allowed: false });
    const { container } = renderCard();
    await waitFor(() => expect(sim.access).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/فِن/)).toBeNull();
    expect(container.querySelector('a[href="/finn"]')).toBeNull();
  });

  it("فشل الخادم: تختفي بصمت ولا تكسر الصفّ", async () => {
    sim.user = { id: "u1" };
    sim.access.mockRejectedValue(new Error("boom"));
    const { container } = renderCard();
    await waitFor(() => expect(sim.access).toHaveBeenCalledTimes(1));
    expect(container).toBeEmptyDOMElement();
  });

  it("المالك: بطاقة بالصورة والرابط والشريط الحرفيّ", async () => {
    sim.user = { id: "owner" };
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();

    expect(await screen.findByRole("heading", { name: "فِن" })).toBeInTheDocument();
    expect(screen.getByText(FINN_BANNER_AR)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /افتح محادثة فِن/ })).toHaveAttribute("href", "/finn");

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    // الصورة من بيان الرئيسية وحده: مصدرها وأبعادها ونصّها البديل (صورة توضيحية).
    expect(img).toHaveAttribute("src", HOME_IMAGES.finn.src);
    expect(img).toHaveAttribute("width", String(HOME_IMAGES.finn.width));
    expect(img).toHaveAttribute("height", String(HOME_IMAGES.finn.height));
    expect(img?.getAttribute("alt")).toContain("صورة توضيحية");
  });

  it("الإنجليزية: الاسم والرابط بلغته، والاتجاه ltr", async () => {
    sim.user = { id: "owner" };
    sim.locale = "en";
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    expect(await screen.findByRole("heading", { name: "Finn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open the Finn chat/ })).toHaveAttribute(
      "href",
      "/finn",
    );
    expect(container.querySelector("section")).toHaveAttribute("dir", "ltr");
  });

  it("المفتاح نفسه لمدخل الشريط: نداءٌ واحد يخدم الموضعين", async () => {
    sim.user = { id: "owner" };
    sim.access.mockResolvedValue(OWNER);
    renderCard();
    await screen.findByRole("heading", { name: "فِن" });
    expect(sim.access).toHaveBeenCalledTimes(1);
  });
});

describe("المحادثة المضمَّنة في الرئيسية (أمر المالك ٢٠٢٦/١٠/٢٣)", () => {
  beforeEach(() => {
    sim.user = { id: "owner" };
    sim.locale = "ar";
    sim.access.mockReset();
  });

  it("المالك: المحادثة نفسها داخل البطاقة (هيئة inline) بحقل كتابة وبدايات سريعة", async () => {
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    const chat = await waitFor(() => {
      const el = container.querySelector('[data-finn-chat="inline"]');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(chat.closest("[data-finn-home-card]")).not.toBeNull();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    // الرابط إلى الصفحة الكاملة باقٍ بجانبها.
    expect(screen.getByRole("link", { name: /افتح محادثة فِن/ })).toHaveAttribute("href", "/finn");
  });

  it("لا شريط تحذيري ثانٍ ولا h1 ولا منطقة (section) ثانية بالاسم نفسه", async () => {
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    await waitFor(() =>
      expect(container.querySelector('[data-finn-chat="inline"]')).not.toBeNull(),
    );
    expect(screen.getAllByText(FINN_BANNER_AR)).toHaveLength(1);
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector('[data-finn-chat="inline"]')?.tagName).toBe("DIV");
  });

  it("الطيّ يُخفي المحادثة بـhidden لا بفكّها — فلا تضيع المسوّدة", async () => {
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    const box = await screen.findByRole("textbox");
    fireEvent.change(box, { target: { value: "اكتب سكربت أتمتة" } });

    const fold = screen.getByRole("button", { name: /إخفاء المحادثة/ });
    expect(fold).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(fold);

    const toggled = screen.getByRole("button", { name: /إظهار المحادثة/ });
    expect(toggled).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(toggled.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveAttribute("hidden");
    // ما زالت في الشجرة بمسوّدتها.
    expect(container.querySelector('[data-finn-chat="inline"]')).not.toBeNull();
    fireEvent.click(toggled);
    expect(screen.getByRole("textbox")).toHaveValue("اكتب سكربت أتمتة");
  });

  it("غير المالك: لا محادثة ولا أثر لها في الشجرة", async () => {
    sim.access.mockResolvedValue({ allowed: false });
    const { container } = renderCard();
    await waitFor(() => expect(sim.access).toHaveBeenCalledTimes(1));
    expect(container.querySelector("[data-finn-chat]")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("واجهة المحادثة لا تدخل حزمة الرئيسية: استيرادٌ كسول بعد الحكم، لا ساكن", () => {
    const src = readFileSync("src/components/finn/HomeFinnCard.tsx", "utf8");
    expect(src).toMatch(/lazy\(\(\) => import\("@\/components\/finn\/FinnChat"\)\)/);
    expect(src).not.toMatch(/^import[^;]*FinnChat[^;]*from/m);
    // المحادثة لا تُركَّب إلا بعد `data.allowed` (الحكم يسبق الاستيراد).
    expect(src.indexOf("if (!data?.allowed) return null")).toBeLessThan(src.indexOf("<InlineChat"));
  });
});

describe("بيان الصورة — فِن رجل أمن مختلف عن سَدِيد", () => {
  it("ملف مستقلّ تحت public/home لا ملف شخصية سَدِيد", () => {
    expect(HOME_IMAGES.finn.src).toMatch(/^\/home\/finn-portrait\.webp$/);
    expect(HOME_IMAGES.finn.src).not.toBe(HOME_IMAGES.persona.src);
    expect(HOME_IMAGES.finn.alt).toContain("صورة توضيحية");
  });
});

/** أبعاد WebP من ترويسته (VP8X · VP8L · VP8) — أبعاد الملف لا ما يُكتب عنه. */
function webpDims(bytes: Buffer): { width: number; height: number } {
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8X")
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}

describe("ملف الصورة — موجودٌ فعلًا بأبعاده ووزنه (لا بطاقة بصورة مكسورة)", () => {
  const FILE = `public${HOME_IMAGES.finn.src}`;

  it("الملف موجود وهو WebP بأبعاد البيان ×2 (قاعدة الرئيسية)", () => {
    expect(existsSync(FILE), `${FILE} غير موجود`).toBe(true);
    const bytes = readFileSync(FILE);
    expect(bytes.toString("latin1", 0, 4)).toBe("RIFF");
    expect(bytes.toString("latin1", 8, 12)).toBe("WEBP");
    expect(webpDims(bytes)).toEqual({
      width: HOME_IMAGES.finn.width * 2,
      height: HOME_IMAGES.finn.height * 2,
    });
  });

  it("مجموع public/home داخل سقف الوزن بعد إضافته", () => {
    const total = readdirSync("public/home")
      .map((f) => statSync(`public/home/${f}`))
      .filter((s) => s.isFile())
      .reduce((n, s) => n + s.size, 0);
    expect(total).toBeLessThanOrEqual(HOME_IMAGES_MAX_BYTES);
  });
});
