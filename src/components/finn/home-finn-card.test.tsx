/** Public home entry; the chat, engine status and session remain owner-only. */
import { createHash } from "node:crypto";
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
    <a href={to} {...rest}>{children}</a>
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
    <QueryClientProvider client={client}><HomeFinnCard /></QueryClientProvider>,
  );
}

describe("HomeFinnCard — public entry and private access", () => {
  beforeEach(() => {
    sim.user = null;
    sim.locale = "ar";
    sim.access.mockReset();
  });

  it("shows a guest entry without an access request or chat", () => {
    const { container } = renderCard();
    expect(container.querySelector('[data-finn-access="guest"]')).not.toBeNull();
    expect(screen.getByRole("link", { name: /دخول المالك إلى فنن/ })).toHaveAttribute("href", "/auth");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(sim.access).not.toHaveBeenCalled();
  });

  it("denied accounts see no chat, engine details or private route", async () => {
    sim.user = { id: "u1" };
    sim.access.mockResolvedValue({ allowed: false });
    const { container } = renderCard();
    await waitFor(() => expect(container.querySelector('[data-finn-access="denied"]')).not.toBeNull());
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(container.querySelector('a[href="/finn"]')).toBeNull();
    expect(container.querySelector("[data-finn-readiness]")).toBeNull();
  });

  it("access failures show a neutral retry state, never a raw error or chat", async () => {
    sim.user = { id: "u1" };
    sim.access.mockRejectedValue(new Error("private-server-detail"));
    const { container } = renderCard();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(container.querySelector('[data-finn-access="error"]')).not.toBeNull();
    expect(container).not.toHaveTextContent("private-server-detail");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("allows an explicit retry after the server recovers", async () => {
    sim.user = { id: "owner" };
    sim.access.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(OWNER);
    renderCard();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: /إعادة التحقق من الصلاحية/ }));
    expect(await screen.findByRole("link", { name: /افتح محادثة فِن/ })).toBeInTheDocument();
    expect(sim.access).toHaveBeenCalledTimes(2);
  });

  it("owner sees the portrait, private route and unchanged warning", async () => {
    sim.user = { id: "owner" };
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    expect(await screen.findByRole("link", { name: /افتح محادثة فِن/ })).toHaveAttribute("href", "/finn");
    expect(screen.getByText(FINN_BANNER_AR)).toBeInTheDocument();
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", HOME_IMAGES.finn.src);
    expect(img).toHaveAttribute("width", String(HOME_IMAGES.finn.width));
    expect(img).toHaveAttribute("height", String(HOME_IMAGES.finn.height));
    expect(img?.getAttribute("alt")).toContain("صورة توضيحية");
  });

  it("English owner card keeps its language and ltr direction", async () => {
    sim.user = { id: "owner" };
    sim.locale = "en";
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    expect(await screen.findByRole("link", { name: /Open the Finn chat/ })).toHaveAttribute("href", "/finn");
    expect(screen.getByRole("heading", { name: "Finn" })).toBeInTheDocument();
    expect(container.querySelector("section")).toHaveAttribute("dir", "ltr");
  });

  it("uses the existing access query rather than a second permission system", async () => {
    sim.user = { id: "owner" };
    sim.access.mockResolvedValue(OWNER);
    renderCard();
    await screen.findByRole("link", { name: /افتح محادثة فِن/ });
    expect(sim.access).toHaveBeenCalledTimes(1);
  });

  it("discloses that capabilities are advisory, not autonomous execution", async () => {
    sim.user = { id: "owner" };
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    await screen.findByRole("link", { name: /افتح محادثة فِن/ });
    expect(container.querySelector('[data-finn-execution="advisory"]')).toBeInTheDocument();
    expect(screen.getByText("تم التحقق من صلاحية المالك.")).toBeInTheDocument();
  });
});

describe("owner chat inline on the homepage", () => {
  beforeEach(() => {
    sim.user = { id: "owner" };
    sim.locale = "ar";
    sim.access.mockReset();
  });

  it("renders the existing inline chat with a composer inside the card", async () => {
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    await screen.findByRole("textbox");
    expect(container.querySelector('[data-finn-chat="inline"]')?.closest("[data-finn-home-card]")).not.toBeNull();
    expect(screen.getByRole("link", { name: /افتح محادثة فِن/ })).toHaveAttribute("href", "/finn");
  });

  it("does not duplicate the safety banner, h1 or named section", async () => {
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    await screen.findByRole("textbox");
    expect(screen.getAllByText(FINN_BANNER_AR)).toHaveLength(1);
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector('[data-finn-chat="inline"]')?.tagName).toBe("DIV");
  });

  it("folding uses hidden so the same owner's draft survives", async () => {
    sim.access.mockResolvedValue(OWNER);
    const { container } = renderCard();
    const box = await screen.findByRole("textbox");
    fireEvent.change(box, { target: { value: "اكتب سكربت أتمتة" } });
    fireEvent.click(screen.getByRole("button", { name: /إخفاء المحادثة/ }));
    const toggle = screen.getByRole("button", { name: /إظهار المحادثة/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")).toHaveAttribute("hidden");
    expect(container.querySelector('[data-finn-chat="inline"]')).not.toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByRole("textbox")).toHaveValue("اكتب سكربت أتمتة");
  });

  it("never mounts a conversation for a denied account", async () => {
    sim.access.mockResolvedValue({ allowed: false });
    const { container } = renderCard();
    await waitFor(() => expect(sim.access).toHaveBeenCalledTimes(1));
    expect(container.querySelector("[data-finn-chat]")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("loads chat lazily only after the server permission guard", () => {
    const src = readFileSync("src/components/finn/HomeFinnCard.tsx", "utf8");
    expect(src).toMatch(/lazy\(\(\) => import\("@\/components\/finn\/FinnChat"\)\)/);
    expect(src).not.toMatch(/^import[^;]*FinnChat[^;]*from/m);
    const guard = src.indexOf('if (state !== "owner" || !data?.allowed)');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(src.indexOf("<InlineChat"));
  });
});

describe("FNN portrait asset integrity", () => {
  it("uses an independent content-versioned portrait, never SADEED's", () => {
    expect(HOME_IMAGES.finn.src).toMatch(/^\/home\/finn-portrait-[a-f0-9]{8}\.webp$/);
    expect(HOME_IMAGES.finn.src).not.toBe(HOME_IMAGES.persona.src);
    expect(HOME_IMAGES.finn.alt).toContain("صورة توضيحية");
  });

  it("matches the image name to its actual Git blob hash", () => {
    const bytes = readFileSync(`public${HOME_IMAGES.finn.src}`);
    const hash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    expect(HOME_IMAGES.finn.src).toBe(`/home/finn-portrait-${hash.slice(0, 8)}.webp`);
  });
});

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

describe("FNN portrait file dimensions and budget", () => {
  const FILE = `public${HOME_IMAGES.finn.src}`;
  it("is a real WebP with the declared 2x dimensions", () => {
    expect(existsSync(FILE), `${FILE} غير موجود`).toBe(true);
    const bytes = readFileSync(FILE);
    expect(bytes.toString("latin1", 0, 4)).toBe("RIFF");
    expect(bytes.toString("latin1", 8, 12)).toBe("WEBP");
    expect(webpDims(bytes)).toEqual({ width: HOME_IMAGES.finn.width * 2, height: HOME_IMAGES.finn.height * 2 });
  });
  it("keeps public/home within its existing image budget", () => {
    const total = readdirSync("public/home").map((f) => statSync(`public/home/${f}`)).filter((s) => s.isFile()).reduce((n, s) => n + s.size, 0);
    expect(total).toBeLessThanOrEqual(HOME_IMAGES_MAX_BYTES);
  });
});
