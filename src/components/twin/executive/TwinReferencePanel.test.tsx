import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { TwinReferencePanel } from "./TwinReferencePanel";

vi.mock("@/components/twin/TwinFilmPlayer", () => ({
  TwinFilmPlayer: ({ film, manual }: { film?: string; manual?: boolean }) => (
    <div data-testid="attached-player" data-film={film} data-manual={String(Boolean(manual))} />
  ),
}));

afterEach(() => localStorage.clear());

it.each(["ar", "en"])(
  "opens the autoplay reference profile by default and allows closing it (%s)",
  async (locale) => {
    localStorage.setItem("locale", locale);
    const { container } = render(
      <I18nProvider>
        <TwinReferencePanel initialRegionId="central" />
      </I18nProvider>,
    );
    expect(container.querySelector("video,source,iframe")).toBeNull();
    expect(container.querySelector(".tx-poster")).toHaveAttribute(
      "src",
      "/media/refinery/refinery-scene-1280.webp",
    );
    const open = screen.getByRole("button", {
      name: locale === "ar" ? "فيلم توضيحي" : "Illustrative film",
    });
    expect(open).toHaveAttribute("aria-expanded", "true");
    const player = await screen.findByTestId("attached-player");
    expect(player).toHaveAttribute("data-film", "reference");
    expect(player).toHaveAttribute("data-manual", "false");
    expect(screen.getAllByTestId("attached-player")).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: locale === "ar" ? "إغلاق الفيلم" : "Close film" }),
    );
    expect(screen.queryByTestId("attached-player")).toBeNull();
    expect(open).toHaveFocus();
  },
);
