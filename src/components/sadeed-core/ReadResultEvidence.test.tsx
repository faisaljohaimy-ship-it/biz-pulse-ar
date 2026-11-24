import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadResultEvidence } from "./ReadResultEvidence";

const message = {
  parts: [
    {
      type: "tool-sec_list_incidents",
      state: "output-available",
      output: {
        ok: true,
        count: 1,
        incidents: [
          {
            id: "3d78c00d-26e4-4b5c-a518-5bed1d4aab80",
            ref: "INC-001",
            title_ar: "PRIVATE INCIDENT TITLE",
            notes: "PRIVATE NOTES",
          },
        ],
      },
    },
  ],
};

describe("read-result evidence presentation", () => {
  it.each(["ar", "en"] as const)(
    "shows honest sample/source metadata without raw rows: %s",
    (locale) => {
      const { container } = render(<ReadResultEvidence message={message} locale={locale} />);
      const ar = locale === "ar";
      expect(screen.getByText("INC-001")).toBeInTheDocument();
      expect(container.textContent).toContain(ar ? "الإجمالي: غير معلوم" : "Total: unknown");
      expect(container.textContent).toContain(ar ? "غير مرفق" : "Not provided");
      expect(container.textContent).not.toContain("PRIVATE");
      expect(
        screen.getByRole("link", { name: ar ? "فتح صفحة المصدر" : "Open source page" }),
      ).toHaveAttribute("href", "/sec/incidents");
      expect(container.querySelector("button")).toBeNull();
    },
  );

  it("shows an unavailable result as unknown rather than an empty successful read", () => {
    render(
      <ReadResultEvidence
        locale="en"
        message={{
          parts: [{ ...message.parts[0], output: { ok: false, error: "PRIVATE ERROR" } }],
        }}
      />,
    );
    expect(screen.getByText(/Read result unavailable; count is unknown/)).toBeInTheDocument();
    expect(screen.queryByText(/Returned records:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
  });
});
