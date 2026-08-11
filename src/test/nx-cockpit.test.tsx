/**
 * Executive cockpit — click-path + contract audit suite.
 *
 * Laws enforced here (package 06 acceptance gates B/E/F):
 *   - every module of the reference composition renders,
 *   - every interactive control carries a REGISTERED data-action,
 *   - region selection updates the dependent content,
 *   - the four map modes actually change the visualization,
 *   - KPI/layer/stage details open in the drawer,
 *   - the event stream pauses into a buffer and resumes by merging,
 *   - experience levels change density,
 *   - the initiative workflow validates and passes the human gate,
 *   - touch targets declare the 44px floor,
 *   - the voice button routes to the ONE SADEED integration (store command).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { RegionProvider } from "@/lib/region-context";
import { REGIONS } from "@/lib/regions";
import { useSadeedStore } from "@/lib/sadeed-core/store";
import { NxCockpitPage } from "@/routes/-nx-cockpit-page";
import { auditCockpitActions, COCKPIT_ACTIONS } from "@/components/cockpit/actions";
import {
  createDemoCockpitRepository,
  type CockpitEvent,
  type ExecutiveCockpitRepository,
} from "@/components/cockpit/repository";

function makeTestRepo(): { repo: ExecutiveCockpitRepository; push: (e: CockpitEvent) => void } {
  const base = createDemoCockpitRepository({ latencyMs: 0, eventIntervalMs: 9_999_999 });
  const queue: CockpitEvent[] = [];
  let notify: (() => void) | null = null;
  const push = (e: CockpitEvent) => {
    queue.push(e);
    notify?.();
  };
  const repo: ExecutiveCockpitRepository = {
    ...base,
    async *getEventStream(signal) {
      while (!signal?.aborted) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            notify = resolve;
            signal?.addEventListener("abort", () => resolve(), { once: true });
          });
          notify = null;
        }
        if (signal?.aborted) return;
        const event = queue.shift();
        if (event) yield event;
      }
    },
  };
  return { repo, push };
}

async function renderCockpit(repo?: ExecutiveCockpitRepository) {
  const utils = render(
    // ترويسة القمرة صارت تعرض `SadeedWordmark` الكانوني (توحيد العلامة بدل
    // السداسي اليدوي)، وهو يقرأ اللغة من `useI18n` — فبدون المزوّد يرمي
    // عند أول تصيير وتسقط الثلاثة عشر اختبارًا هنا معًا.
    <I18nProvider>
      <ThemeProvider>
        <RegionProvider>
          <NxCockpitPage
            repository={
              repo ?? createDemoCockpitRepository({ latencyMs: 0, eventIntervalMs: 9_999_999 })
            }
            urlSync={false}
          />
        </RegionProvider>
      </ThemeProvider>
    </I18nProvider>,
  );
  await screen.findByTestId("system-header");
  return utils;
}

beforeEach(() => {
  window.localStorage.clear();
  useSadeedStore.setState({ pendingCommands: [], mode: "collapsed", voice: "idle" });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("executive cockpit — composition", () => {
  it("renders every module of the reference composition", async () => {
    await renderCockpit();
    for (const testId of [
      "system-header",
      "architecture-layer-rail",
      "side-navigation",
      "runtime-data-flow",
      "primary-kpi-strip",
      "strategic-map",
      "saudi-map-visualization",
      "region-metric-cards",
      "sadeed-panel",
      "quick-actions",
      "sadeed-voice",
      "capability-grid",
      "event-stream",
      "experience-level-bar",
    ]) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
    // The four frozen regions — regions.ts is the single source.
    const cards = screen.getByTestId("region-metric-cards");
    for (const region of REGIONS) {
      expect(within(cards).getByText(region.shortAr)).toBeInTheDocument();
    }
  });

  it("absolute-clarity law: visible h1 and identification sentence on every viewport", async () => {
    // ٢٠٢٦/٠٨/١١ بأمر المالك: رُفعت شارة المحاكاة عن كل شاشة. فسقط شرط الشارة من «قانون الوضوح المطلق»، وبقي شرطاه الآخران —
    // وهما الحاملان للقانون أصلًا: عنوانٌ ظاهر يقول أين أنت، وجملةُ تعريفٍ
    // تقول ما هذا السطح. الشارة كانت تقول **مصدر** الأرقام لا **هوية**
    // الشاشة، وحراسة مصدرها انتقلت إلى أسطح الإفصاح النصّي.
    await renderCockpit();
    const heading = screen.getByRole("heading", { level: 1, name: "قمرة القيادة التنفيذية" });
    expect(heading).toBeInTheDocument();
    expect(heading.className).not.toMatch(/hidden/);
    expect(
      within(screen.getByTestId("system-header")).queryByText("محاكاة مرجعية"),
      "عادت شارة المحاكاة إلى ترويسة القمرة بعد رفعها",
    ).not.toBeInTheDocument();
    expect(screen.getByText(/لوحة القيادة العليا لسَدِيد/)).toBeInTheDocument();
  });

  it("action law: every interactive control carries a registered data-action", async () => {
    const { container } = await renderCockpit();
    expect(auditCockpitActions(container)).toEqual([]);
  });

  it("registry integrity: audit catches dead and unregistered controls", () => {
    expect(COCKPIT_ACTIONS.size).toBeGreaterThan(50);
    const host = document.createElement("div");
    host.innerHTML = `<button>ميت</button><button data-action="not.registered">مجهول</button>`;
    expect(auditCockpitActions(host)).toHaveLength(2);
  });
});

describe("executive cockpit — interactions", () => {
  it("selecting a region updates the recommendation, cards and announcement", async () => {
    await renderCockpit();
    // Initial region is the app default (western) — its recommendation lands.
    await screen.findByText(/المنطقة الغربية: يوصى/);

    const cards = screen.getByTestId("region-metric-cards");
    const eastern = within(cards).getByRole("button", { name: /الشرقية/ });
    fireEvent.click(eastern);

    await screen.findByText(/المنطقة الشرقية: يوصى بزيادة الاستثمار/);
    expect(eastern).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("cockpit-live-region")).toHaveTextContent(/الشرقية/);
  });

  it("the four map modes actually change the visualization state", async () => {
    await renderCockpit();
    const scene = screen.getByTestId("saudi-map-visualization");
    expect(scene).toHaveAttribute("data-map-mode", "3d");
    for (const [label, mode] of [
      ["طبقات البيانات", "layers"],
      ["خريطة حرارية", "heat"],
      ["تتبع مباشر", "live"],
      ["عرض ثلاثي الأبعاد", "3d"],
    ] as const) {
      const button = screen.getByRole("button", { name: label });
      fireEvent.click(button);
      expect(scene).toHaveAttribute("data-map-mode", mode);
      expect(button).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("a KPI card opens the detail drawer with source and provenance", async () => {
    await renderCockpit();
    fireEvent.click(screen.getByRole("button", { name: /صحة النظام.*فتح التفاصيل/ }));
    const drawer = await screen.findByTestId("detail-drawer");
    expect(within(drawer).getByText("مصدر البيانات")).toBeInTheDocument();
    expect(within(drawer).getByText("المراقبة التشغيلية")).toBeInTheDocument();
  });

  it("an architecture layer opens its health drawer (latency + trace)", async () => {
    await renderCockpit();
    const rail = screen.getByTestId("architecture-layer-rail");
    fireEvent.click(within(rail).getByRole("button", { name: /منصة التشغيل/ }));
    const drawer = await screen.findByTestId("detail-drawer");
    expect(within(drawer).getByText("زمن الاستجابة")).toBeInTheDocument();
    expect(within(drawer).getByText("trc-pl-4821")).toBeInTheDocument();
  });

  it("a runtime stage chip opens stage details with duration and trace", async () => {
    await renderCockpit();
    const flow = screen.getByTestId("runtime-data-flow");
    fireEvent.click(within(flow).getByRole("button", { name: /الاعتماد/ }));
    const drawer = await screen.findByTestId("detail-drawer");
    expect(within(drawer).getByText("زمن المرحلة")).toBeInTheDocument();
    expect(within(drawer).getByText(/بوابة الاعتماد البشري/)).toBeInTheDocument();
  });

  it("event stream: pause buffers, resume merges, dismiss hides", async () => {
    const { repo, push } = makeTestRepo();
    await renderCockpit(repo);

    push({
      id: "t-a",
      time: "12:00",
      severity: "info",
      titleAr: "حدث ألف",
      detailAr: "تفصيل",
      source: "اختبار",
    });
    await screen.findByText("حدث ألف");

    fireEvent.click(screen.getByRole("button", { name: "إيقاف الأحداث مؤقتًا" }));
    push({
      id: "t-b",
      time: "12:01",
      severity: "info",
      titleAr: "حدث باء",
      detailAr: "تفصيل",
      source: "اختبار",
    });
    await screen.findByText(/في الانتظار/);
    expect(screen.queryByText("حدث باء")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "استئناف الأحداث" }));
    await screen.findByText("حدث باء");

    fireEvent.click(screen.getByRole("button", { name: "إخفاء الحدث: حدث باء" }));
    await waitFor(() => expect(screen.queryByText("حدث باء")).not.toBeInTheDocument());
  });

  it("experience levels change density (technical exposes stage timings)", async () => {
    await renderCockpit();
    expect(screen.queryByText(/310ms/)).not.toBeInTheDocument();
    const technical = screen.getByRole("button", { name: /المستوى التقني/ });
    fireEvent.click(technical);
    expect(technical).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText(/310ms/)).toBeInTheDocument();
    // Preference persists (allowed non-sensitive storage).
    expect(window.localStorage.getItem("nexios.cockpit.level")).toBe("technical");
  });

  it("initiative workflow: validates empty input, then passes the human gate", async () => {
    await renderCockpit();
    fireEvent.click(screen.getByRole("button", { name: "إنشاء مبادرة جديدة" }));
    const modal = await screen.findByTestId("action-modal");

    fireEvent.click(within(modal).getByRole("button", { name: "إنشاء المبادرة" }));
    expect(await within(modal).findByText("اكتب اسم المبادرة أولًا")).toBeInTheDocument();

    fireEvent.change(within(modal).getByPlaceholderText(/تحسين جاهزية/), {
      target: { value: "مبادرة اختبارية" },
    });
    fireEvent.click(within(modal).getByRole("button", { name: "إنشاء المبادرة" }));
    await waitFor(() => expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    // The approved command lands in the event log (audit trail).
    expect(await screen.findByText("سُجل إجراء معتمد")).toBeInTheDocument();
  });

  it("voice + chat buttons route to the ONE SADEED integration (store command)", async () => {
    await renderCockpit();
    fireEvent.click(screen.getByRole("button", { name: "تحدث إلى سديد" }));
    expect(useSadeedStore.getState().pendingCommands.some((c) => c.kind === "open")).toBe(true);

    useSadeedStore.setState({ pendingCommands: [] });
    fireEvent.click(screen.getByRole("button", { name: "محادثة سَدِيد" }));
    expect(useSadeedStore.getState().pendingCommands.some((c) => c.kind === "open")).toBe(true);
  });

  it("touch-target law: cockpit controls declare the 44px floor", async () => {
    const { container } = await renderCockpit();
    const controls = container.querySelectorAll<HTMLElement>("[data-action]");
    expect(controls.length).toBeGreaterThan(30);
    for (const el of Array.from(controls)) {
      if (el.tagName !== "BUTTON" && el.tagName !== "A") continue;
      // KPI wrappers contain a full-height card — the card IS the target.
      if (el.getAttribute("data-kpi")) continue;
      expect(
        /min-h-11|size-11|h-12|size-12/.test(el.className),
        `${el.getAttribute("data-action")} بلا حد لمس 44px`,
      ).toBe(true);
    }
  });
});

describe("executive cockpit — data layer", () => {
  it("repository regions mirror the frozen four-region source", async () => {
    const repo = createDemoCockpitRepository({ latencyMs: 0 });
    const snapshot = await repo.getSnapshot();
    expect(snapshot.simulation).toBe(true);
    expect(snapshot.regions.map((r) => r.regionId)).toEqual(REGIONS.map((r) => r.id));
    expect(snapshot.metrics.length).toBe(5);
    expect(snapshot.layers.length).toBe(5);
    expect(snapshot.runtimeFlow.length).toBe(7);
    expect(snapshot.capabilities.length).toBe(6);
  });

  it("region reads honor AbortSignal (rapid switching cancels)", async () => {
    const repo = createDemoCockpitRepository({ latencyMs: 50 });
    const controller = new AbortController();
    const pending = repo.getRegion("eastern", controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
