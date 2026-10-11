/**
 * مرفقات سَدِيد — تُرسَل إلى المحادثة أجزاءَ `file` (AI SDK v5) ليقرأها
 * النموذج، والنصّية منها تُودَع أيضًا في قاعدة معرفة النظام لتُرتَّب وتُستشهد.
 *
 * **الحدود هنا مرآةٌ لحارس الخادم** (`src/routes/api/-chat-guard.ts`) لا
 * اجتهادٌ مستقل — قِيس ٢٠٢٦/١٠/١١ أن العميل كان يقبل ما يرفضه الخادم بـ400/413:
 * - الأنواع: الخادم يقبل قائمة محددة (لا GIF ولا HEIC)، و«image/*» كان يمرّرها.
 * - المجموع: base64 يضخّم الحجم ~٣٣٪، وسقف جسم الطلب 24MB؛ فخمسة ملفات بـ8MB
 *   (40MB خامًا ⇐ ~53MB) تُرفض حتمًا. سقف المجموع الخام هنا 16MB (⇐ ~21.3MB).
 * - الامتداد يحسم النوع حين يخطئه المتصفح (CSV يصل `application/vnd.ms-excel`
 *   على ويندوز، وMarkdown يصل بنوع فارغ) — فيُرسَل النوع الذي يقبله الخادم.
 */
export const SADEED_MAX_FILES = 5;
export const SADEED_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const SADEED_MAX_TOTAL_BYTES = 16 * 1024 * 1024;

/** الامتداد ⇐ النوع المقبول في الخادم. القائمة كلها، لا أكثر. */
const EXT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  txt: "text/plain",
  csv: "text/csv",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
};

const SERVER_TYPES = new Set(Object.values(EXT_TYPES));

export const SADEED_ACCEPT = [
  ...new Set(Object.values(EXT_TYPES)),
  ...Object.keys(EXT_TYPES).map((e) => `.${e}`),
].join(",");

const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase();

/** النوع الذي يُرسَل: نوع المتصفح إن قبله الخادم، وإلا ما يقتضيه الامتداد. */
export function serverMediaType(file: Pick<File, "name" | "type">): string | null {
  const t = (file.type || "").toLowerCase();
  if (SERVER_TYPES.has(t)) return t;
  return EXT_TYPES[extOf(file.name)] ?? null;
}

export function isTextFile(file: Pick<File, "name" | "type">): boolean {
  const t = serverMediaType(file);
  return t !== null && (t.startsWith("text/") || t === "application/json");
}

export interface SadeedFilePart {
  type: "file";
  mediaType: string;
  filename: string;
  url: string;
}

export function validateFiles(files: File[]): { ok: File[]; rejected: string[] } {
  const ok: File[] = [];
  const rejected: string[] = [];
  let total = 0;
  for (const f of files) {
    if (!serverMediaType(f)) rejected.push(`${f.name}: نوعٌ غير مدعوم`);
    // الخادم يرفض data URL فارغًا (400) — يُرفض هنا بسببٍ مفهوم.
    else if (f.size === 0) rejected.push(`${f.name}: ملفٌّ فارغ`);
    else if (ok.length >= SADEED_MAX_FILES)
      rejected.push(`${f.name}: تجاوز الحد (${SADEED_MAX_FILES})`);
    else if (f.size > SADEED_MAX_FILE_BYTES) rejected.push(`${f.name}: أكبر من 8MB`);
    else if (total + f.size > SADEED_MAX_TOTAL_BYTES)
      rejected.push(`${f.name}: مجموع المرفقات يتجاوز 16MB`);
    else {
      ok.push(f);
      total += f.size;
    }
  }
  return { ok, rejected };
}

export function fileToPart(file: File): Promise<SadeedFilePart> {
  const mediaType = serverMediaType(file);
  if (!mediaType) return Promise.reject(new Error("unsupported attachment type"));
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      // عنوان البيانات يحمل نوع المتصفح؛ والخادم يشترط تطابقه مع `mediaType`.
      const raw = String(r.result);
      const comma = raw.indexOf(",");
      resolve({
        type: "file",
        mediaType,
        filename: file.name,
        url: `data:${mediaType};base64,${comma >= 0 ? raw.slice(comma + 1) : ""}`,
      });
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
