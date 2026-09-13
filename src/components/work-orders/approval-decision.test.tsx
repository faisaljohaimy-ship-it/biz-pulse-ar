/**
 * قرار الاعتماد — البند الإلزامي ٣ من أمر المالك ٢٠٢٦/٠٩/١٣:
 * «أيقونتا القرار مخفيتان للضيف ولغير المخوَّل».
 *
 * **مخفيّتان لا معطَّلتان**: زرٌّ باهت يقول لغير المخوَّل «هنا صلاحيةٌ لا
 * تملكها»، وهو إفشاءُ سطح قرارٍ بلا فائدة. فالتأكيد على `queryByRole` —
 * الغياب من شجرة الوصول كلّها — لا على `toBeDisabled`.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalDecision } from "./ApprovalDecision";

describe("③ شرط الظهور — المخوَّل غير الضيف وحده", () => {
  it("الضيف لا يرى المكوّن إطلاقًا", () => {
    const { container } = render(
      <ApprovalDecision value="none" onChange={() => {}} canApprove isGuest />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("وغير المخوَّل لا يراه ولو كان مصادَقًا", () => {
    const { container } = render(
      <ApprovalDecision value="none" onChange={() => {}} canApprove={false} isGuest={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("ولا يظهر معطَّلًا — الغياب من شجرة الوصول لا التعطيل", () => {
    render(
      <ApprovalDecision value="none" onChange={() => {}} canApprove={false} isGuest={false} />,
    );
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText("قرار الاعتماد")).toBeNull();
  });

  it("والمخوَّل المصادَق يرى الزرّين بعنوانهما", () => {
    render(<ApprovalDecision value="none" onChange={() => {}} canApprove isGuest={false} />);
    expect(screen.getByText("قرار الاعتماد")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "اعتماد أمر العمل" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "إرجاع أمر العمل لصاحبه" })).toBeTruthy();
  });
});

describe("③ب إتاحة الوصول والسلوك", () => {
  it("مجموعة اختيارٍ واحدة بتسمية عربية", () => {
    render(<ApprovalDecision value="none" onChange={() => {}} canApprove isGuest={false} />);
    expect(screen.getByRole("radiogroup", { name: "قرار الاعتماد" })).toBeTruthy();
  });

  it("و`aria-checked` يتبع الاختيار لا المظهر وحده", () => {
    render(<ApprovalDecision value="approve" onChange={() => {}} canApprove isGuest={false} />);
    expect(
      screen.getByRole("radio", { name: "اعتماد أمر العمل" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("radio", { name: "إرجاع أمر العمل لصاحبه" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("والاختيار قابل للإلغاء بالنقر ثانيةً — يعود إلى `none`", async () => {
    const onChange = vi.fn();
    render(<ApprovalDecision value="approve" onChange={onChange} canApprove isGuest={false} />);
    await userEvent.click(screen.getByRole("radio", { name: "اعتماد أمر العمل" }));
    expect(onChange).toHaveBeenCalledWith("none");
  });

  it("والنقر على غير المختار ينقل القرار إليه", async () => {
    const onChange = vi.fn();
    render(<ApprovalDecision value="approve" onChange={onChange} canApprove isGuest={false} />);
    await userEvent.click(screen.getByRole("radio", { name: "إرجاع أمر العمل لصاحبه" }));
    expect(onChange).toHaveBeenCalledWith("return");
  });

  it("وهدف اللمس ≥44px على الزرّين معًا", () => {
    render(<ApprovalDecision value="none" onChange={() => {}} canApprove isGuest={false} />);
    for (const btn of screen.getAllByRole("radio")) {
      expect(btn.className, btn.getAttribute("aria-label") ?? "").toMatch(/min-h-11/);
      expect(btn.className).toMatch(/min-w-11/);
    }
  });

  it("والفرق بين الحالتين ليس لونًا وحده — أيقونة وتسمية معًا (WCAG 1.4.1)", () => {
    render(<ApprovalDecision value="none" onChange={() => {}} canApprove isGuest={false} />);
    const approve = screen.getByRole("radio", { name: "اعتماد أمر العمل" });
    const back = screen.getByRole("radio", { name: "إرجاع أمر العمل لصاحبه" });
    expect(approve.textContent).toContain("اعتماد");
    expect(back.textContent).toContain("إرجاع");
    expect(approve.querySelector("svg")?.getAttribute("class")).not.toBe(
      back.querySelector("svg")?.getAttribute("class"),
    );
  });
});
