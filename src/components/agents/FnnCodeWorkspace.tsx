import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Code2,
  Download,
  FilePlus2,
  FolderOpen,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  parseFnnCodeDraft,
  type FnnCodeFile,
  type FnnCodeBundleSummary,
} from "@/lib/dual-agent/code-workspace";
import {
  listFnnCodeBundles,
  readFnnCodeBundle,
  saveFnnCodeBundle,
} from "@/lib/dual-agent/code-workspace.functions";

const template: FnnCodeFile = {
  path: "automation/review.json",
  content: JSON.stringify(
    {
      name_ar: "مراجعة تشغيل دورية",
      name_en: "Operational review",
      enabled: false,
      schedule: "*/5 * * * *",
      steps: [{ action: "review_saved_operational_report", mode: "read_only" }],
      note: "قالب للمراجعة؛ حفظه لا يسجله في المجدول ولا يشغّله.",
    },
    null,
    2,
  ),
};
const control = "nx-owner-control min-h-11 gap-2";
const invalidMessage =
  "راجع مسارات الملفات وصيغة JSON وحدود الحجم، واحذف أي بيانات اعتماد قبل الحفظ.";

/** Files remain inert text. Memory is scoped to the keyed owner dialog, never browser storage. */
export function FnnCodeWorkspace({
  onReadAutomation,
  automationBusy = false,
}: {
  onReadAutomation?: () => void;
  automationBusy?: boolean;
}) {
  const list = useServerFn(listFnnCodeBundles);
  const read = useServerFn(readFnnCodeBundle);
  const save = useServerFn(saveFnnCodeBundle);
  const [title, setTitle] = useState("مسودة code");
  const [files, setFiles] = useState<FnnCodeFile[]>([]);
  const [selected, setSelected] = useState(0);
  const [bundles, setBundles] = useState<FnnCodeBundleSummary[]>([]);
  const [listed, setListed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const epoch = useRef(0);
  const running = useRef(false);
  useEffect(
    () => () => {
      epoch.current += 1;
    },
    [],
  );
  const parsed = useMemo(() => {
    try {
      return parseFnnCodeDraft({ title, files });
    } catch {
      return null;
    }
  }, [title, files]);
  const active = files[selected];

  async function request<T>(operation: () => Promise<T>, write = false): Promise<T | undefined> {
    if (running.current) return undefined;
    running.current = true;
    const id = ++epoch.current;
    setBusy(true);
    setError("");
    setStatus("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("deadline")), write ? 8000 : 4000);
        }),
      ]);
      return epoch.current === id ? result : undefined;
    } catch {
      if (epoch.current === id)
        setError(
          write
            ? "لم تصل نتيجة الحفظ. حدّث الحزم المحفوظة قبل إعادة الحفظ لتجنب إنشاء نسخة مكررة."
            : "تعذّر إكمال الطلب. أعد المحاولة، أو افتح مساحة المالك مجددًا.",
        );
      return undefined;
    } finally {
      clearTimeout(timer);
      if (epoch.current === id) {
        running.current = false;
        setBusy(false);
      }
    }
  }

  function replaceFiles(next: FnnCodeFile[]) {
    setFiles(next);
    setSelected(Math.max(0, Math.min(selected, next.length - 1)));
    setError("");
    setStatus("");
  }
  async function upload(input: HTMLInputElement) {
    const incoming = Array.from(input.files ?? []);
    input.value = "";
    if (!incoming.length || running.current) return;
    if (incoming.length + files.length > 10 || incoming.some((file) => file.size > 262144)) {
      setError("اختر حتى ١٠ ملفات نصية، بحد ٢٥٦ كيلوبايت للملف ومجموع ميغابايت واحد.");
      return;
    }
    const added = await request(async () =>
      Promise.all(
        incoming.map(async (file) => ({
          path: file.name,
          content: new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()),
        })),
      ),
    );
    if (!added) return;
    try {
      const draft = parseFnnCodeDraft({ title, files: [...files, ...added] });
      replaceFiles(draft.files);
      setSelected(files.length);
      setStatus("أُضيفت الملفات إلى المسودة. احفظ الحزمة لرفعها إلى النظام قبل إغلاق النافذة.");
    } catch {
      setError(invalidMessage);
    }
  }
  async function refresh() {
    const result = await request(() => list());
    if (result) {
      setBundles(result.bundles);
      setListed(true);
    }
  }
  async function persist() {
    if (!parsed) {
      setError(invalidMessage);
      return;
    }
    const result = await request(() => save({ data: parsed }), true);
    if (result) {
      setBundles((previous) =>
        [result, ...previous.filter((item) => item.id !== result.id)].slice(0, 10),
      );
      setListed(true);
      setStatus(`حُفظت حزمة خاصة: ${result.title}. لم تُطبّق على كود النظام ولم يُنشر الموقع.`);
    }
  }
  async function openBundle(id: string) {
    const result = await request(() => read({ data: { id } }));
    if (result) {
      setTitle(result.title);
      setFiles(result.files);
      setSelected(0);
      setStatus("فُتحت الحزمة المحفوظة. التعديلات مسودة جديدة؛ الحفظ ينشئ نسخة مستقلة.");
    }
  }
  function download() {
    if (!parsed) {
      setError(invalidMessage);
      return;
    }
    const blob = new Blob(
      [JSON.stringify({ version: 1, kind: "fnn-code-draft", ...parsed }, null, 2)],
      { type: "application/octet-stream" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fnn-code-draft.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("نُزّلت حزمة JSON للمراجعة. لم تُرفع ولم تُنفّذ.");
  }

  return (
    <section aria-label="مساحة code" aria-busy={busy} className="min-w-0 space-y-4 pb-4 text-sm">
      <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Code2 className="h-5 w-5" aria-hidden />
          <bdi>code</bdi> · الأتمتة والبرمجة
        </h3>
        <p>ارفع ملفات نصية، حرّرها، وافحص JSON ثم احفظ حزمة خاصة داخل النظام أو نزّلها للمراجعة.</p>
        <p className="text-muted-foreground">
          الحفظ لا يشغّل الملفات أو يفعّل الأتمتة، ولا يغيّر كود الموقع. الربط بالنشر إلى المستودع
          غير مهيأ لهذه المساحة بعد.
        </p>
        <p className="text-xs text-muted-foreground">
          حتى ١٠ ملفات UTF-8 · ٢٥٦ كيلوبايت للملف · ميغابايت واحد إجمالًا. لا ترفع كلمات مرور أو
          مفاتيح.
        </p>
      </div>
      <fieldset disabled={busy} className="min-w-0 space-y-3">
        <div className="space-y-1">
          <label htmlFor="fnn-code-title" className="font-semibold">
            اسم الحزمة
          </label>
          <Input
            id="fnn-code-title"
            value={title}
            maxLength={100}
            onChange={(event) => {
              setTitle(event.target.value);
              setStatus("");
            }}
            className="nx-owner-control min-h-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <label
            className={`${control} relative inline-flex cursor-pointer items-center rounded-lg border border-input px-3 focus-within:ring-2 focus-within:ring-ring ${busy ? "opacity-50" : ""}`}
          >
            <Upload className="h-4 w-4" aria-hidden /> إضافة ملفات
            <input
              aria-label="إضافة ملفات code"
              type="file"
              multiple
              accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html,.sql,.py,.yml,.yaml,.csv,.xml,.sh"
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              onChange={(event) => void upload(event.currentTarget)}
            />
          </label>
          <Button
            variant="outline"
            className={control}
            disabled={files.length >= 10}
            onClick={() => {
              let index = files.length + 1;
              while (files.some((file) => file.path === `code/file-${index}.txt`)) index += 1;
              replaceFiles([...files, { path: `code/file-${index}.txt`, content: "" }]);
              setSelected(files.length);
            }}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden /> ملف جديد
          </Button>
          <Button
            variant="outline"
            className={control}
            disabled={files.length >= 10 || files.some((file) => file.path === template.path)}
            onClick={() => {
              replaceFiles([...files, { ...template }]);
              setSelected(files.length);
            }}
          >
            قالب أتمتة للمراجعة
          </Button>
        </div>
        {!files.length ? (
          <p className="rounded-lg border border-dashed p-4 text-muted-foreground">
            ابدأ بإضافة ملف نصي أو اختر قالب الأتمتة. احفظ الحزمة قبل إغلاق النافذة.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" aria-label="ملفات المسودة">
              {files.map((file, index) => (
                <Button
                  key={index}
                  variant={selected === index ? "default" : "outline"}
                  className={`${control} max-w-full`}
                  onClick={() => setSelected(index)}
                  aria-pressed={selected === index}
                >
                  <bdi className="truncate">{file.path}</bdi>
                </Button>
              ))}
            </div>
            {active && (
              <div className="space-y-2 rounded-xl border border-border p-3">
                <label htmlFor="fnn-code-path" className="font-semibold">
                  مسار الملف داخل الحزمة
                </label>
                <Input
                  id="fnn-code-path"
                  dir="ltr"
                  className="nx-owner-control min-h-11 font-mono"
                  maxLength={200}
                  value={active.path}
                  onChange={(event) =>
                    replaceFiles(
                      files.map((file, index) =>
                        index === selected ? { ...file, path: event.target.value } : file,
                      ),
                    )
                  }
                />
                <label htmlFor="fnn-code-content" className="block font-semibold">
                  محتوى الملف
                </label>
                <Textarea
                  id="fnn-code-content"
                  dir="ltr"
                  spellCheck={false}
                  className="nx-owner-code-editor font-mono text-xs"
                  maxLength={262144}
                  value={active.content}
                  onChange={(event) =>
                    replaceFiles(
                      files.map((file, index) =>
                        index === selected ? { ...file, content: event.target.value } : file,
                      ),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  className={control}
                  onClick={() => replaceFiles(files.filter((_, index) => index !== selected))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> إزالة من المسودة
                </Button>
              </div>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {parsed
            ? "اجتازت المسودة فحص المسارات والحجم وصيغة JSON. هذا ليس اختبارًا لصحة البرنامج أو أمانه."
            : files.length
              ? invalidMessage
              : "لا توجد ملفات جاهزة للحفظ بعد."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button className={control} disabled={!parsed} onClick={() => void persist()}>
            <Save className="h-4 w-4" aria-hidden /> حفظ حزمة خاصة في النظام
          </Button>
          <Button variant="outline" className={control} disabled={!parsed} onClick={download}>
            <Download className="h-4 w-4" aria-hidden /> تنزيل الحزمة
          </Button>
        </div>
      </fieldset>
      {busy && (
        <p role="status" className="animate-pulse text-muted-foreground">
          جارٍ إكمال الطلب…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-destructive">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="rounded-lg border border-primary/30 p-3">
          {status}
        </p>
      )}
      <section aria-label="الحزم الخاصة المحفوظة" className="space-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold">آخر الحزم الخاصة المحفوظة</h4>
          <Button
            variant="outline"
            className={control}
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden /> تحديث الحزم
          </Button>
        </div>
        {!listed ? (
          <p className="text-muted-foreground">اضغط تحديث لقراءة آخر ١٠ حزم من النظام.</p>
        ) : !bundles.length ? (
          <p className="text-muted-foreground">لا توجد حزم محفوظة. أضف ملفًا ثم احفظ أول حزمة.</p>
        ) : (
          <ul className="space-y-2">
            {bundles.map((bundle) => (
              <li key={bundle.id} className="rounded-lg border border-border p-3">
                <p className="break-words font-semibold">{bundle.title}</p>
                <p className="text-xs text-muted-foreground">
                  {bundle.fileCount} ملفات · {new Date(bundle.createdAt).toLocaleString("ar-SA")}
                </p>
                <Button
                  variant="ghost"
                  className={`${control} max-w-full`}
                  disabled={busy}
                  onClick={() => void openBundle(bundle.id)}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">فتح {bundle.title}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="flex flex-wrap gap-2">
        {onReadAutomation && (
          <Button
            variant="outline"
            className={control}
            disabled={busy || automationBusy}
            onClick={onReadAutomation}
          >
            قراءة حالة أتمتة FNN
          </Button>
        )}
        <Button asChild variant="outline" className={control}>
          <a href="/orchestration">أدوات FNN وسجل التنفيذ</a>
        </Button>
        <Button asChild variant="outline" className={control}>
          <a href="/knowledge-upload">استيراد مستندات المعرفة</a>
        </Button>
      </div>
    </section>
  );
}
