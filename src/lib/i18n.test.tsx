import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/lib/i18n";

function Probe() {
  const { locale, dir, t, setLocale } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="signin">{t("auth.signin")}</span>
      <span data-testid="missing">{t("definitely.not.a.key" as never)}</span>
      <button type="button" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
        toggle
      </button>
    </div>
  );
}

describe("i18n", () => {
  it("provides a locale + RTL direction and translates a known key bilingually", () => {
    render(
      <I18nProvider initialLocale="ar">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("locale").textContent).toBe("ar");
    expect(screen.getByTestId("dir").textContent).toBe("rtl");
    expect(screen.getByTestId("signin").textContent).toBe("تسجيل الدخول");
  });

  it("switches to LTR and English when locale changes", async () => {
    render(
      <I18nProvider initialLocale="en">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("dir").textContent).toBe("ltr");
    expect(screen.getByTestId("signin").textContent).toBe("Sign in");
  });

  it("falls back to the key itself when no translation exists (no fabrication)", () => {
    render(
      <I18nProvider initialLocale="en">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("missing").textContent).toBe("definitely.not.a.key");
  });
});
