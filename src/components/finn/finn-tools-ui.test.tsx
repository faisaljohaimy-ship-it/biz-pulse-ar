/**
 * أدوات فِن في الواجهة (٢٠٢٦/١٠/٢٤) — ما يراه المالك حين ينادي فِن أداةَ قراءة.
 *
 * ناقل الشبكة مُحاكى بترتيب ما يفعله الحقيقي (onMeta ثم onTool/onDelta…). ما يُفحص:
 * السطر يسمّي الأداة **نصًّا** (لا لونًا وحده) ويحسم حالها، ولا يظهر بلا أدوات، ولا يكسر
 * الوصولية، ولا يمسّ نصّ الرد.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinnReplyMeta, FinnTransportResult } from "@/lib/finn-agent/client";
import type { FinnEngineStatus } from "@/lib/finn-agent/status";
import type { FinnToolName, FinnToolPhase } from "@/lib/finn-agent/tool-names";

type Opts = {
  onMeta: (meta: FinnReplyMeta) => void;
  onDelta: (text: string) => void;
  onTool?: (event: { name: FinnToolName; phase: FinnToolPhase }) => void;
};

const transport = vi.hoisted(() => ({
  script: null as null | ((opts: Opts) => Promise<FinnTransportResult>),
}));

vi.mock("@/lib/finn-agent/client", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  streamFinnReply: async (opts: Opts) => {
    if (!transport.script) throw new Error("no script");
    return transport.script(opts);
  },
}));

import FinnChat from "./FinnChat";

const ENGINE: FinnEngineStatus = { gpt: true, gptModel: "gpt-4.1", fallback: true, paused: false };

async function send(text: string) {
  fireEvent.change(screen.getByRole("textbox", { name: /رسالتك إلى فِن/ }), {
    target: { value: text },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /إرسال/ }));
  });
}

beforeEach(() => {
  transport.script = null;
});

describe("سطر الأدوات المستعملة", () => {
  it("أداتان: الاسم والحال نصٌّ بالعربية، ونصّ الرد سليم", async () => {
    transport.script = async ({ onMeta, onTool, onDelta }) => {
      onMeta({ engine: "gpt", fallback: null });
      onTool?.({ name: "platform_status", phase: "start" });
      onTool?.({ name: "platform_status", phase: "done" });
      onTool?.({ name: "github_activity", phase: "start" });
      onTool?.({ name: "github_activity", phase: "error" });
      onDelta("الحالة سليمة، وGitHub غير مهيّأ.");
      return { ok: true, truncated: false };
    };
    const { container } = render(<FinnChat engine={ENGINE} />);
    await send("ما حال المنصّة؟");
    await waitFor(() => expect(screen.getByText(/الحالة سليمة/)).toBeInTheDocument());
    const line = screen.getByText(/أدوات القراءة المستعملة/).closest("p");
    expect(line).toHaveTextContent("حالة المنصّة (تمّ)");
    expect(line).toHaveTextContent("نشاط GitHub (تعذّر)");
    // نداءٌ جارٍ حُسم: لا يبقى «جارٍ» ولا يتكرّر الاسم.
    expect(line?.textContent).not.toContain("(جارٍ)");
    expect(line?.textContent?.match(/حالة المنصّة/g)).toHaveLength(1);
    expect(
      await axe(container, { rules: { "color-contrast": { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it("نداءٌ ما زال جاريًا يُعرَض «جارٍ»", async () => {
    let release: () => void = () => undefined;
    transport.script = async ({ onMeta, onTool }) => {
      onMeta({ engine: "gpt", fallback: null });
      onTool?.({ name: "vercel_deployments", phase: "start" });
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { ok: true, truncated: false };
    };
    render(<FinnChat engine={ENGINE} />);
    await send("ما المنشور؟");
    await waitFor(() => expect(screen.getByText(/نشرات Vercel \(جارٍ\)/)).toBeInTheDocument());
    await act(async () => release());
  });

  it("بلا أدوات: لا سطرَ ولا أثر", async () => {
    transport.script = async ({ onMeta, onDelta }) => {
      onMeta({ engine: "gpt", fallback: null });
      onDelta("رد بلا أدوات");
      return { ok: true, truncated: false };
    };
    render(<FinnChat engine={ENGINE} />);
    await send("سؤال نظري");
    await waitFor(() => expect(screen.getByText(/رد بلا أدوات/)).toBeInTheDocument());
    expect(screen.queryByText(/أدوات القراءة المستعملة/)).toBeNull();
  });

  it("حسمٌ يصل بلا بدء (ترتيبٌ مقلوب) يُسجَّل ولا يُسقط الواجهة", async () => {
    transport.script = async ({ onMeta, onTool, onDelta }) => {
      onMeta({ engine: "gpt", fallback: null });
      onTool?.({ name: "github_activity", phase: "done" });
      onDelta("x");
      return { ok: true, truncated: false };
    };
    render(<FinnChat engine={ENGINE} />);
    await send("؟");
    await waitFor(() => expect(screen.getByText(/نشاط GitHub \(تمّ\)/)).toBeInTheDocument());
  });
});
