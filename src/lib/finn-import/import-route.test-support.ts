/**
 * أدوات اختبارٍ فقط لمسار `POST /api/finn/import`: ثوابت ومُنشئ طلبات multipart ومحمِّل معالجات.
 * **لا `vi.mock` هنا** — التهيئة (المحاكاة) في كل ملف اختبار لأن `vi.mock` يُرفَع لأعلى الملف.
 * كل بيانات الاختبار اصطناعية تُبنى وقت التشغيل (CLAUDE.md: لا بيانات حقيقية في git).
 */
import { vi } from "vitest";
import { makeXlsx, type Aoa } from "./fixtures.test-support";

export const OWNER = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
export const OTHER = "9d8c7b6a-5e4f-4a3b-9c2d-1e0f9a8b7c6d";
export const APPROVAL_SECRET = "z".repeat(48);
export const CRON_SECRET = "c".repeat(40);

/** قيم مزروعة: لا تظهر أبدًا في استجابة المعاينة ولا في السجلّ ولا في رسالة خطأ. */
export const PLANTED = {
  cell: "خلية-مزروعة-QX7",
  cellLatin: "PLANTED-CELL-QX7",
  fileName: "planted-file-name-QX7.xlsx",
  id: "1012345678",
  phone: "0501234567",
  email: "planted.person@example.com",
  headerPii: "0509876543",
  error: "PLANTED-ERROR-TEXT-QX7",
} as const;

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
export const jwtFor = (sub: string) => `${b64({ alg: "HS256" })}.${b64({ sub })}.sig`;

export type Handler = (args: { request: Request }) => Promise<Response>;
export type Handlers = Record<string, Handler>;

/** المعالجات من وحدة المسار (الحقيقية أو نسخة مُضعَّفة بمسارٍ مطلق). */
export async function handlersOf(modulePath = "@/routes/api/finn/import"): Promise<Handlers> {
  const mod = (await import(/* @vite-ignore */ modulePath)) as unknown as {
    Route: { options: { server: { handlers: Handlers } } };
  };
  return mod.Route.options.server.handlers;
}

export interface BuildOptions {
  action?: string | null;
  token?: string | null;
  file?: { name: string; bytes: Uint8Array | string } | null;
  /** يُضاف حقل ملف ثانٍ (اختبار «ملف واحد بالضبط»). */
  secondFile?: { name: string; bytes: Uint8Array | string };
  /** يُضاف فعلٌ ثانٍ. */
  secondAction?: string;
  bearer?: string | null;
  headers?: Record<string, string>;
  /** يستبدل الجسم كله (غير multipart مثلًا). */
  rawBody?: BodyInit;
  contentType?: string | null;
}

export function buildRequest(options: BuildOptions = {}): Request {
  const bearer = options.bearer === undefined ? jwtFor(OWNER) : options.bearer;
  const headers: Record<string, string> = {
    ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    ...options.headers,
  };
  if (options.rawBody !== undefined) {
    if (options.contentType) headers["content-type"] = options.contentType;
    return new Request("http://local/api/finn/import", {
      method: "POST",
      headers,
      body: options.rawBody,
    });
  }
  const form = new FormData();
  if (options.action !== null) form.append("action", options.action ?? "preview");
  if (options.secondAction !== undefined) form.append("action", options.secondAction);
  if (options.token) form.append("token", options.token);
  const file =
    options.file === undefined ? { name: "data.xlsx", bytes: xlsxBytes() } : options.file;
  if (file) form.append("file", new File([file.bytes as BlobPart], file.name));
  if (options.secondFile) {
    form.append("file", new File([options.secondFile.bytes as BlobPart], options.secondFile.name));
  }
  // الحدود تضعها الـRequest بنفسها من FormData (لا يُضبط content-type يدويًّا).
  return new Request("http://local/api/finn/import", { method: "POST", headers, body: form });
}

/** مصنّف xlsx اصطناعي بصفّين فيهما قيم مزروعة وأنماط شخصية. */
export function xlsxBytes(rows?: Aoa, sheetName = "البيانات"): Uint8Array {
  return makeXlsx([
    {
      name: sheetName,
      rows: rows ?? [
        ["الاسم", "الجوال", "ملاحظة"],
        [PLANTED.cell, PLANTED.phone, `هوية ${PLANTED.id} بريد ${PLANTED.email}`],
        [PLANTED.cellLatin, "—", "سطر ثانٍ"],
      ],
    },
  ]);
}

export const jsonOf = async (res: Response): Promise<Record<string, unknown>> =>
  (await res.json()) as Record<string, unknown>;

/**
 * يلتقط كل ما يُطبع في الكونسول **بمحتواه**، والأخطاء تُفرَّد (name/message/stack) لأن JSON يطويها
 * `{}` فيمرّ تسريب `console.error(error)` دون أن يُرى (درس مسار الدردشة). بديلٌ أصرم من
 * `captureConsole` في `fixtures.test-support.ts` لمن يحرس **نصّ الاستثناء**.
 */
export async function captureLogs<T>(fn: () => Promise<T>): Promise<{ result: T; output: string }> {
  const spies = (["log", "info", "warn", "error", "debug", "trace"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  );
  try {
    const result = await fn();
    const output = JSON.stringify(
      spies.flatMap((s) => s.mock.calls),
      (_key, value) =>
        value instanceof Error
          ? { ...value, name: value.name, message: value.message, stack: value.stack }
          : value,
    );
    return { result, output: output === "[]" ? "" : output };
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}
