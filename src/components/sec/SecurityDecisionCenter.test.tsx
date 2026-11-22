import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { I18nProvider } from "@/lib/i18n";
import { SecurityDecisionCenter } from "./SecurityDecisionCenter";
import { OMEGA_ASSUMPTION_LABELS, type OmegaInputKey } from "@/lib/sadeed/omega-security-lab";

function renderCenter(locale: "ar" | "en" = "ar") {
  localStorage.setItem("locale", locale);
  return render(
    <I18nProvider>
      <SecurityDecisionCenter />
    </I18nProvider>,
  );
}

async function proceedToReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Start scenario" }));
  await user.click(screen.getByRole("button", { name: "View recommendations" }));
  await user.click(screen.getByRole("button", { name: "Continue to human review" }));
}

beforeEach(() => {
  localStorage.clear();
});

describe("Security Decision Center interaction", () => {
  it.each<OmegaInputKey>([
    "cameraAvailable",
    "patrolCount",
    "responseMinutes",
    "routeOpen",
    "connectivityAvailable",
  ])("invalidates the local review and export when %s changes", async (key) => {
    const user = userEvent.setup();
    renderCenter("en");
    await proceedToReview(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Record review · simulation" }));
    expect(screen.getByRole("button", { name: "Export report · simulation" })).toBeEnabled();
    const name = OMEGA_ASSUMPTION_LABELS[key].labelEn;
    if (key === "patrolCount" || key === "responseMinutes") {
      fireEvent.change(screen.getByRole("slider", { name }), {
        target: { value: key === "patrolCount" ? "3" : "45" },
      });
    } else {
      await user.click(screen.getByRole("button", { name }));
    }
    expect(screen.getByRole("button", { name: "Export report · simulation" })).toBeDisabled();
    expect(screen.queryByText("Simulated review recorded")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start scenario" }));
    expect(
      screen.getByRole("heading", { name: "Critical · precautionary demo rating" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "View recommendations" }));
    await user.click(screen.getByRole("button", { name: "Continue to human review" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Record review · simulation" })).toBeDisabled();
  });

  it("preserves assumptions across locale changes and restores the selected scenario baseline on reset", async () => {
    const user = userEvent.setup();
    renderCenter("en");
    fireEvent.change(
      screen.getByRole("slider", { name: OMEGA_ASSUMPTION_LABELS.patrolCount.labelEn }),
      {
        target: { value: "4" },
      },
    );
    await user.click(
      screen.getByRole("button", { name: OMEGA_ASSUMPTION_LABELS.cameraAvailable.labelEn }),
    );
    await user.click(screen.getByRole("button", { name: "التبديل إلى العربية" }));
    expect(
      screen.getByRole("slider", { name: OMEGA_ASSUMPTION_LABELS.patrolCount.labelAr }),
    ).toHaveValue("4");
    expect(
      screen.getByRole("button", { name: OMEGA_ASSUMPTION_LABELS.cameraAvailable.labelAr }),
    ).toHaveAttribute("aria-pressed", "false");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "اختر سيناريو العرض" }),
      "camera",
    );
    expect(
      screen.getByRole("slider", { name: OMEGA_ASSUMPTION_LABELS.patrolCount.labelAr }),
    ).toHaveValue("2");
    expect(
      screen.getByRole("slider", { name: OMEGA_ASSUMPTION_LABELS.responseMinutes.labelAr }),
    ).toHaveValue("30");
    await user.click(
      screen.getByRole("button", { name: OMEGA_ASSUMPTION_LABELS.cameraAvailable.labelAr }),
    );
    await user.click(screen.getByRole("button", { name: "إعادة الضبط" }));
    expect(
      screen.getByRole("button", { name: OMEGA_ASSUMPTION_LABELS.cameraAvailable.labelAr }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "تصدير التقرير · محاكاة" })).toBeDisabled();
  });

  it("changes Arabic RTL to English LTR without losing the current assessment or its log", async () => {
    const user = userEvent.setup();
    const { container } = renderCenter();

    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(container.firstElementChild).toHaveAttribute("lang", "ar");
    expect(screen.getByRole("note")).toHaveTextContent("بيانات افتراضية بالكامل");
    await user.click(screen.getByRole("button", { name: "ابدأ السيناريو" }));
    expect(screen.getByRole("heading", { name: "حرج · تصنيف تجريبي احترازي" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Switch to English" }));
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(container.firstElementChild).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("note")).toHaveTextContent("ALL DATA IS SYNTHETIC");
    expect(
      screen.getByRole("heading", { name: "Critical · precautionary demo rating" }),
    ).toBeVisible();
    const log = screen.getByRole("list", { name: "Simulation log" });
    expect(within(log).getAllByRole("listitem")).toHaveLength(1);
    expect(log).toHaveTextContent("no real report was received");
    expect(screen.queryByRole("button", { name: "Start scenario" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "التبديل إلى العربية" }));
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "حرج · تصنيف تجريبي احترازي" })).toBeVisible();
    expect(screen.getByRole("list", { name: "سجل المحاكاة" })).toHaveTextContent(
      "لم يُستقبل بلاغ حقيقي",
    );
  });

  it("expands evidence with keyboard input and exposes its limits without implying verification", async () => {
    const user = userEvent.setup();
    renderCenter("en");
    const access = screen.getByRole("button", { name: "Synthetic access log" });
    const camera = screen.getByRole("button", { name: "Synthetic camera reference" });
    const accessDetails = document.getElementById(access.getAttribute("aria-controls")!);
    const cameraDetails = document.getElementById(camera.getAttribute("aria-controls")!);
    expect(access).toHaveAttribute("aria-expanded", "false");
    expect(accessDetails).not.toBeVisible();

    access.focus();
    await user.keyboard("{Enter}");
    expect(access).toHaveAttribute("aria-expanded", "true");
    expect(accessDetails).toBeVisible();
    expect(accessDetails).toHaveTextContent("scenario fixture only");

    await user.click(camera);
    expect(camera).toHaveAttribute("aria-expanded", "true");
    expect(cameraDetails).toBeVisible();
    expect(cameraDetails).toHaveTextContent("No images or live feed are available");
    expect(access).toHaveAttribute("aria-expanded", "false");
    expect(accessDetails).not.toBeVisible();
    await user.click(camera);
    expect(cameraDetails).not.toBeVisible();
  });

  it("gates both simulated review outcomes and resets all temporary state without making requests", async () => {
    const user = userEvent.setup();
    // Prevent a regression from contacting any real endpoint while exercising every action.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network call"));
    try {
      renderCenter("en");
      for (const [action, confirmation] of [
        ["Record review · simulation", "Simulated review recorded"],
        ["Request verification · simulation", "Simulated verification request recorded"],
      ]) {
        await proceedToReview(user);
        const recordReview = screen.getByRole("button", { name: "Record review · simulation" });
        const requestVerification = screen.getByRole("button", {
          name: "Request verification · simulation",
        });
        expect(recordReview).toBeDisabled();
        expect(requestVerification).toBeDisabled();
        await user.click(recordReview);
        expect(screen.queryByText("Simulated review recorded")).not.toBeInTheDocument();

        const acknowledgement = screen.getByRole("checkbox", {
          name: /recording a review grants no operational approval/,
        });
        await user.click(acknowledgement);
        expect(recordReview).toBeEnabled();
        expect(requestVerification).toBeEnabled();
        await user.click(acknowledgement);
        expect(recordReview).toBeDisabled();
        expect(requestVerification).toBeDisabled();
        await user.click(acknowledgement);
        await user.click(screen.getByRole("button", { name: action }));

        expect(screen.getByText(confirmation)).toBeVisible();
        expect(screen.getByText("Human approval required")).toBeVisible();
        expect(screen.getByText(/Operational approval is still required/)).toHaveTextContent(
          "No message was sent and no action was executed",
        );
        expect(
          within(screen.getByRole("list", { name: "Simulation log" })).getAllByRole("listitem"),
        ).toHaveLength(4);
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: action })).not.toBeInTheDocument();

        const evidence = screen.getByRole("button", { name: "Synthetic access log" });
        await user.click(evidence);
        await user.click(screen.getByRole("button", { name: "Reset demo" }));
        expect(screen.getByText("The scenario has not started")).toBeVisible();
        expect(screen.queryByRole("list", { name: "Simulation log" })).not.toBeInTheDocument();
        expect(evidence).toHaveAttribute("aria-expanded", "false");
      }
      // Revisiting review after reset requires a fresh acknowledgement.
      await proceedToReview(user);
      expect(screen.getByRole("checkbox")).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Record review · simulation" })).toBeDisabled();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("provides accessible initial Arabic and interactive English review states", async () => {
    const user = userEvent.setup();
    const { container } = renderCenter();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Switch to English" }));
    await proceedToReview(user);
    await user.click(screen.getByRole("button", { name: "Synthetic camera reference" }));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("exports only a completed local review and starts a fresh journey when switching scenarios", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((_blob: Blob) => "blob:local-synthetic-report");
    const revokeObjectURL = vi.fn();
    const NativeURL = globalThis.URL;
    vi.stubGlobal(
      "URL",
      class extends NativeURL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    const downloads: Array<{ href: string; filename: string }> = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push({ href: this.href, filename: this.download });
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network call"));
    try {
      renderCenter("en");
      expect(screen.getByRole("button", { name: "Export report · simulation" })).toBeDisabled();
      await user.selectOptions(
        screen.getByRole("combobox", { name: "Choose a demo scenario" }),
        "camera",
      );
      expect(
        screen.getByRole("heading", { name: /Camera unavailable at a fictional entry point/ }),
      ).toBeVisible();
      const cameraEvidence = screen.getByRole("button", { name: "Synthetic outage signal" });
      await user.click(cameraEvidence);
      expect(cameraEvidence).toHaveAttribute("aria-expanded", "true");
      await proceedToReview(user);
      expect(screen.getByRole("button", { name: "Export report · simulation" })).toBeDisabled();
      expect(createObjectURL).not.toHaveBeenCalled();
      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByRole("button", { name: "Record review · simulation" }));
      expect(screen.getByRole("button", { name: "Export report · simulation" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "التبديل إلى العربية" }));
      expect(screen.getByRole("combobox", { name: "اختر سيناريو العرض" })).toHaveValue("camera");
      expect(screen.getByText("سُجّلت المراجعة التجريبية")).toBeVisible();
      expect(screen.getByRole("button", { name: "إشارة انقطاع افتراضية" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("button", { name: "تصدير التقرير · محاكاة" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "تصدير التقرير · محاكاة" }));
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(downloads).toEqual([
        { href: "blob:local-synthetic-report", filename: "SADEED-DEMO-CAMERA-002-ar.html" },
      ]);
      expect(screen.getByText(/جُهّز التقرير محليًا دون إرسال بيانات/)).toBeVisible();
      await waitFor(
        () => expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-synthetic-report"),
        { timeout: 1_500 },
      );

      const blob = createObjectURL.mock.calls[0][0];
      expect(blob.type).toBe("text/html;charset=utf-8");
      const report = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });
      const reportDocument = new DOMParser().parseFromString(report, "text/html");
      expect(reportDocument.documentElement.lang).toBe("ar");
      expect(reportDocument.body.textContent).toContain("SADEED-DEMO-CAMERA-002");
      expect(reportDocument.body.textContent).toContain("الاعتماد التشغيلي غير ممنوح");
      expect(reportDocument.querySelector("script,[src],[href]")).toBeNull();

      await user.click(screen.getByRole("button", { name: "Switch to English" }));
      expect(screen.getByText(/Report prepared locally without sending data/)).toBeVisible();
      await user.selectOptions(
        screen.getByRole("combobox", { name: "Choose a demo scenario" }),
        "patrol",
      );
      expect(
        screen.getByRole("heading", { name: /Missed checkpoint for a fictional patrol/ }),
      ).toBeVisible();
      expect(screen.getByText("The scenario has not started")).toBeVisible();
      expect(screen.queryByRole("list", { name: "Simulation log" })).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Report prepared locally without sending data/),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Export report · simulation" })).toBeDisabled();
      await proceedToReview(user);
      expect(screen.getByRole("checkbox")).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Record review · simulation" })).toBeDisabled();
      await user.selectOptions(
        screen.getByRole("combobox", { name: "Choose a demo scenario" }),
        "camera",
      );
      expect(screen.getByRole("button", { name: "Synthetic outage signal" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.getByText("The scenario has not started")).toBeVisible();
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      click.mockRestore();
      fetchSpy.mockRestore();
    }
  });
});
