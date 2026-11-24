import { fireEvent, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { HomeSadeedCard } from "@/components/home/HomeSadeedCard";
import { SadeedDraftForms } from "./SadeedDraftForms";

const state = vi.hoisted(() => ({ userId: "account-one" }));
const open = vi.hoisted(() => vi.fn());
const ask = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: state.userId, user_metadata: {} }, loading: false }),
}));
vi.mock("@/lib/sadeed-core/hooks/useSadeed", () => ({ useSadeed: () => ({ open, ask }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ isError: false, isPending: false, data: "unknown" }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/sadeed/SadeedStagePresence", () => ({
  SadeedStagePresence: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  localStorage.clear();
  state.userId = "account-one";
});

function formOf(container: HTMLElement, kind: string) {
  const details = container.querySelector<HTMLElement>(`[data-draft-kind="${kind}"]`)!;
  return { details, fields: within(details), form: details.querySelector("form")! };
}

it.each(["ar", "en"] as const)(
  "keeps three forms closed and hands off only after explicit submit: %s",
  (locale) => {
    const handoff = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const view = render(<SadeedDraftForms locale={locale} onDraft={handoff} />);
    const ar = locale === "ar";
    expect(view.container.querySelectorAll("form")).toHaveLength(3);
    expect(view.container.querySelector("form form")).toBeNull();
    for (const detail of view.container.querySelectorAll("details"))
      expect(detail).not.toHaveAttribute("open");
    const { details, fields, form } = formOf(view.container, "summarize");
    fireEvent.click(view.getByText(ar ? "نماذج مسودات للمراجعة" : "Review draft forms"));
    fireEvent.click(details.querySelector("summary")!);
    const topic = fields.getByLabelText(ar ? "الموضوع" : "Topic");
    const notes = fields.getByLabelText(ar ? "ملاحظاتك للمسودة" : "Your draft notes");
    fireEvent.change(topic, { target: { value: ar ? "تسليم الوردية" : "Shift handover" } });
    fireEvent.change(notes, {
      target: { value: '<img src=x onerror="alert(1)"> Notes for review.' },
    });
    expect(handoff).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(view.container.querySelector("img")).toBeNull();
    fireEvent.submit(form);
    expect(handoff).toHaveBeenCalledTimes(1);
    expect(handoff.mock.calls[0][0]).toContain(ar ? "مسودة للمراجعة فقط" : "Review draft only");
    expect(topic).toHaveValue("");
    expect(notes).toHaveValue("");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  },
);

it("resets every form on a real HomeSadeedCard account change and uses open with a draft, never ask", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const view = render(
    <I18nProvider>
      <HomeSadeedCard />
    </I18nProvider>,
  );
  let scoped = formOf(view.container, "prepare_task");
  fireEvent.change(scoped.fields.getByLabelText("الموضوع"), { target: { value: "فحص مقترح" } });
  fireEvent.change(scoped.fields.getByLabelText("ملاحظاتك للمسودة"), {
    target: { value: "اكتب مسودة فقط." },
  });
  expect(open).not.toHaveBeenCalled();
  state.userId = "account-two";
  view.rerender(
    <I18nProvider>
      <HomeSadeedCard />
    </I18nProvider>,
  );
  scoped = formOf(view.container, "prepare_task");
  expect(scoped.fields.getByLabelText("الموضوع")).toHaveValue("");
  expect(scoped.fields.getByLabelText("ملاحظاتك للمسودة")).toHaveValue("");
  fireEvent.change(scoped.fields.getByLabelText("الموضوع"), { target: { value: "فحص مقترح" } });
  fireEvent.change(scoped.fields.getByLabelText("ملاحظاتك للمسودة"), {
    target: { value: "اكتب مسودة فقط." },
  });
  fireEvent.submit(scoped.form);
  expect(open).toHaveBeenCalledWith({
    focus: true,
    draft: expect.stringContaining("مسودة للمراجعة فقط — تحضير مهمة"),
  });
  expect(ask).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(view.container.querySelector("form form")).toBeNull();
});
