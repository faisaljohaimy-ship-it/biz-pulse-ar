import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/dual-agent/code-workspace.functions", () => ({
  listFnnCodeBundles: mocks.list,
  readFnnCodeBundle: mocks.read,
  saveFnnCodeBundle: mocks.save,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
import { FnnCodeWorkspace } from "./FnnCodeWorkspace";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const newFile = () => fireEvent.click(screen.getByRole("button", { name: "ملف جديد" }));
const saveButton = () => screen.getByRole("button", { name: "حفظ حزمة خاصة في النظام" });

describe("owner code workspace", () => {
  it("does not fetch on mount and saves an inert disabled automation template only on explicit click", async () => {
    mocks.save.mockResolvedValue({
      id: "bundle",
      title: "مسودة code",
      fileCount: 1,
      createdAt: "2026-10-22T14:00:00Z",
      totalBytes: 200,
    });
    render(<FnnCodeWorkspace />);
    expect(mocks.list).not.toHaveBeenCalled();
    expect(saveButton()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "قالب أتمتة للمراجعة" }));
    expect(
      JSON.parse((screen.getByLabelText("محتوى الملف") as HTMLTextAreaElement).value).enabled,
    ).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByText(/حُفظت حزمة خاصة:/)).toBeInTheDocument());
    expect(mocks.save).toHaveBeenCalledWith({
      data: {
        title: "مسودة code",
        files: [
          { path: "automation/review.json", content: expect.stringContaining('"enabled": false') },
        ],
      },
    });
    expect(screen.getByText(/لم تُطبّق على كود النظام ولم يُنشر الموقع/)).toBeInTheDocument();
  });
  it("edits text without interpreting markup, rejects invalid JSON and unsafe paths before saving", () => {
    render(<FnnCodeWorkspace />);
    newFile();
    fireEvent.change(screen.getByLabelText("محتوى الملف"), {
      target: { value: '<img src=x onerror="alert(1)">' },
    });
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.change(screen.getByLabelText("مسار الملف داخل الحزمة"), {
      target: { value: "test.json" },
    });
    expect(saveButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText("محتوى الملف"), {
      target: { value: '{"enabled":false}' },
    });
    expect(saveButton()).toBeEnabled();
    fireEvent.change(screen.getByLabelText("مسار الملف داخل الحزمة"), {
      target: { value: "../secret.json" },
    });
    expect(saveButton()).toBeDisabled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("uploads UTF-8 text into the draft without server write and refuses overlarge files", async () => {
    render(<FnnCodeWorkspace />);
    const file = new File(["hello"], "review.txt", { type: "text/plain" });
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new TextEncoder().encode("hello").buffer,
    });
    fireEvent.change(screen.getByLabelText("إضافة ملفات code"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByLabelText("محتوى الملف")).toHaveValue("hello"));
    expect(mocks.save).not.toHaveBeenCalled();
    const huge = new File(["x".repeat(262145)], "huge.txt");
    fireEvent.change(screen.getByLabelText("إضافة ملفات code"), { target: { files: [huge] } });
    expect(screen.getByRole("alert")).toHaveTextContent("٢٥٦ كيلوبايت");
    expect(screen.getByLabelText("محتوى الملف")).toHaveValue("hello");
  });
  it("bounds a hung save and ignores its later completion", async () => {
    vi.useFakeTimers();
    let resolve!: (value: unknown) => void;
    mocks.save.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<FnnCodeWorkspace />);
    newFile();
    fireEvent.click(saveButton());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8001);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("حدّث الحزم المحفوظة");
    expect(saveButton()).toBeEnabled();
    await act(async () => {
      resolve({ id: "late", title: "late", fileCount: 1, createdAt: "2026-10-22T14:00:00Z" });
    });
    expect(screen.queryByText(/حُفظت حزمة خاصة:/)).toBeNull();
  });
  it("isolates a late read from a new keyed owner workspace and provides a retry on failure", async () => {
    let resolve!: (value: unknown) => void;
    mocks.list.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<FnnCodeWorkspace key="old" />);
    fireEvent.click(screen.getByRole("button", { name: "تحديث الحزم" }));
    view.rerender(<FnnCodeWorkspace key="new" />);
    await act(async () => {
      resolve({
        bundles: [
          {
            id: "old",
            title: "old private bundle",
            createdAt: "2026-10-22T14:00:00Z",
            fileCount: 1,
          },
        ],
      });
    });
    expect(screen.queryByText("old private bundle")).toBeNull();
    mocks.list.mockRejectedValueOnce(new Error("private provider details"));
    fireEvent.click(screen.getByRole("button", { name: "تحديث الحزم" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("أعد المحاولة"));
    expect(screen.queryByText("private provider details")).toBeNull();
    mocks.list.mockResolvedValueOnce({ bundles: [], sampleLimit: 10 });
    fireEvent.click(screen.getByRole("button", { name: "تحديث الحزم" }));
    await waitFor(() => expect(screen.getByText(/لا توجد حزم محفوظة/)).toBeInTheDocument());
  });
});
