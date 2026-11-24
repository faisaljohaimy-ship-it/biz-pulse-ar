import { fireEvent, render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { REGIONS } from "@/lib/regions";
import {
  TwinExecutiveExperience,
  type TwinExecutiveExperienceProps,
} from "./TwinExecutiveExperience";

function LanguageControl() {
  const { locale, setLocale } = useI18n();
  return (
    <button type="button" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
      Switch language
    </button>
  );
}
function mount(props: TwinExecutiveExperienceProps = {}, locale = "en") {
  localStorage.setItem("locale", locale);
  return render(
    <I18nProvider>
      <LanguageControl />
      <TwinExecutiveExperience {...props} />
    </I18nProvider>,
  );
}
const rows = () => within(document.querySelector<HTMLElement>(".tx-departments")!);

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Executive twin reference experience", () => {
  it("exposes exactly four canonical regions and identifies every numerical section as reference data", () => {
    const view = mount();
    expect(view.container.querySelector(".tx-executive")).toHaveAttribute(
      "data-simulation",
      "true",
    );
    expect(
      screen.getAllByText("Illustrative reference · not operational data").length,
    ).toBeGreaterThan(0);
    for (const region of REGIONS)
      expect(screen.getByRole("button", { name: region.shortEn })).toBeVisible();
    const north = screen.getByText("North · unconnected reference");
    expect(north).toBeVisible();
    expect(north.closest("button")).toBeNull();
    expect(north).not.toHaveAttribute("tabindex");
    fireEvent.click(north);
    expect(screen.getByRole("button", { name: "Central" })).toHaveAttribute("aria-pressed", "true");
    expect(
      within(view.container.querySelector<HTMLElement>(".tx-orbit")!).getAllByRole("button"),
    ).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /North/i })).toBeNull();
    expect(
      within(screen.getByLabelText("Reference image metrics")).getByText("4,820"),
    ).toBeVisible();
    expect(rows().getAllByRole("button")).toHaveLength(5);
    expect(view.container.querySelector("video,source,iframe")).toBeNull();
  });

  it("selects every department into local details while keeping the reference totals unchanged", () => {
    mount();
    for (const name of [
      "Substations",
      "Perimeter & gates",
      "Visual surveillance",
      "Sensors & alarms",
      "Logistics",
    ]) {
      const row = rows().getByRole("button", { name: new RegExp(name.replace("&", "\\&")) });
      fireEvent.click(row);
      expect(row).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("heading", { name })).toBeVisible();
      expect(
        rows()
          .getAllByRole("button")
          .filter((button) => button.getAttribute("aria-pressed") === "true"),
      ).toHaveLength(1);
      expect(
        within(screen.getByLabelText("Reference image metrics")).getByText("4,820"),
      ).toBeVisible();
    }
  });

  it("toggles actual overlays, changes canonical region, and preserves local selection across AR/EN", () => {
    const view = mount();
    fireEvent.click(screen.getByRole("button", { name: "Western" }));
    fireEvent.click(rows().getByRole("button", { name: /Sensors & alarms/ }));
    fireEvent.click(screen.getByRole("button", { name: "Region map" }));
    fireEvent.click(screen.getByRole("button", { name: "Department markers" }));
    expect(view.container.querySelector(".tx-orbit,.tx-assets")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }));
    expect(view.container.querySelector(".tx-executive")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "الاستشعار والإنذار" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "الأمن الصناعي — المنطقة الغربية" })).toBeVisible();
    expect(screen.getByRole("button", { name: "خريطة المناطق" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "خريطة المناطق" }));
    expect(screen.getByText("الشمالية · مرجع غير متصل")).toBeVisible();
    expect(screen.getByRole("button", { name: "الغربية" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "علامات الأقسام" }));
    expect(view.container.querySelector(".tx-assets")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }));
    expect(view.container.querySelector(".tx-executive")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("heading", { name: "Sensors & alarms" })).toBeVisible();
  });

  it("opens a supplied film immediately and restores the toggle when closed", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const film = vi.fn(() => <p>Supplied illustrative player</p>);
    const view = mount({ renderBroadcast: film });
    fireEvent.click(screen.getByRole("button", { name: "Eastern" }));
    fireEvent.click(rows().getByRole("button", { name: /Logistics/ }));
    expect(film).toHaveBeenCalled();
    expect(view.container.querySelector("video,source,iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "Illustrative film" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Supplied illustrative player")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close film" }));
    expect(screen.queryByText("Supplied illustrative player")).toBeNull();
    expect(screen.getByRole("button", { name: "Illustrative film" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Illustrative film" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows an honest unavailable-film state and remains accessible in both languages", async () => {
    const view = mount({}, "ar");
    fireEvent.click(screen.getByRole("button", { name: "فيلم توضيحي" }));
    expect(screen.getByText("لم يُرفق فيديو لهذا المشهد بعد.")).toBeVisible();
    expect(view.container.querySelector("video,source,iframe")).toBeNull();
    expect(await axe(view.container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }));
    expect(screen.getByText("No film has been supplied for this scene yet.")).toBeVisible();
    expect(await axe(view.container)).toHaveNoViolations();
  });
});
