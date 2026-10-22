import { z } from "zod";

export const FNN_CODE_ORG_ID = "00000000-0000-0000-0000-000000000001";
export const FNN_CODE_MAX_FILES = 10;
export const FNN_CODE_MAX_FILE_BYTES = 256 * 1024;
export const FNN_CODE_MAX_TOTAL_BYTES = 1024 * 1024;
export const FNN_CODE_MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
export const FNN_CODE_LIST_LIMIT = 10;

export type FnnCodeFile = { path: string; content: string };
export type FnnCodeDraft = { title: string; files: FnnCodeFile[] };
export type FnnCodeBundle = FnnCodeDraft & {
  version: 1;
  id: string;
  ownerId: string;
  orgId: string;
  createdAt: string;
  totalBytes: number;
  fileSha256: Record<string, string>;
};
export type FnnCodeBundleSummary = {
  id: string;
  title: string;
  createdAt: string;
  fileCount: number;
  totalBytes: number;
};

const FileSchema = z.object({ path: z.string().min(1).max(200), content: z.string() }).strict();
const DraftSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    files: z.array(FileSchema).min(1).max(FNN_CODE_MAX_FILES),
  })
  .strict();
const BundleSchema = DraftSchema.extend({
  version: z.literal(1),
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  orgId: z.literal(FNN_CODE_ORG_ID),
  createdAt: z.string().datetime({ offset: true }),
  totalBytes: z.number().int().nonnegative().max(FNN_CODE_MAX_TOTAL_BYTES),
  fileSha256: z.record(z.string().regex(/^[a-f0-9]{64}$/)),
}).strict();
function forbiddenTextCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (
      (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      (code >= 127 && code <= 159) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    )
      return true;
  }
  return false;
}
const keyMaterial =
  /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----|PuTTY-User-Key-File|\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{30,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/;
const literalCredential =
  /["']?(?:api[_-]?key|access[_-]?token|service[_-]?role[_-]?key|password|client[_-]?secret|secret|private[_-]?key)["']?\s*[:=]\s*["'`][^"'`\r\n]+["'`]/i;
const sensitiveSegment =
  /^(?:\.env(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|id_(?:rsa|dsa|ecdsa|ed25519)(?:\..*)?|\.npmrc|\.netrc|\.aws|\.ssh|\.git)$/i;
const textExtension =
  /\.(?:[cm]?[jt]sx?|json|jsonc|md|txt|css|scss|html?|py|sql|ya?ml|toml|xml|csv|sh|bash)$/i;

/** Reject malformed JS strings rather than silently replacing invalid UTF-8. */
export function fnnCodeUtf8Bytes(value: string): number {
  const bytes = new TextEncoder().encode(value);
  if (
    new TextDecoder("utf-8", { fatal: true }).decode(bytes) !== value ||
    forbiddenTextCharacter(value)
  ) {
    throw new Error("حزمة code تقبل النصوص السليمة فقط، دون محارف خفية أو ثنائية.");
  }
  return bytes.byteLength;
}
function rejectCredentials(text: string): void {
  if (keyMaterial.test(text) || literalCredential.test(text)) {
    throw new Error("احذف كلمات المرور والمفاتيح والأسرار من حزمة code قبل حفظها.");
  }
}
function validatePath(path: string): void {
  const parts = path.split("/");
  if (
    path !== path.normalize("NFC") ||
    path.startsWith("/") ||
    path.startsWith("~") ||
    /[\\:%]/.test(path) ||
    [...path].some((character) => character.charCodeAt(0) < 32) ||
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        /[. ]$/.test(part) ||
        sensitiveSegment.test(part) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
    ) ||
    /\.(?:pem|key|p12|pfx|keystore)$/i.test(path) ||
    !(
      textExtension.test(path) ||
      /(?:^|\/)(?:\.gitignore|\.dockerignore|\.editorconfig)$/.test(path)
    )
  )
    throw new Error("مسار ملف code غير آمن أو ليس ملفًا نصيًا مسموحًا.");
}

export function parseFnnCodeDraft(input: unknown): FnnCodeDraft {
  const parsed = DraftSchema.safeParse(input);
  if (!parsed.success)
    throw new Error("أدخل عنوانًا وحزمة code من ملف واحد إلى عشرة ملفات نصية فقط.");
  const draft = parsed.data;
  fnnCodeUtf8Bytes(draft.title);
  rejectCredentials(draft.title);
  const names = new Set<string>();
  let total = 0;
  for (const file of draft.files) {
    fnnCodeUtf8Bytes(file.path);
    validatePath(file.path);
    const name = file.path.toLowerCase();
    if (names.has(name)) throw new Error("لا تكرر مسار الملف داخل حزمة code.");
    names.add(name);
    const size = fnnCodeUtf8Bytes(file.content);
    if (size > FNN_CODE_MAX_FILE_BYTES) throw new Error("حجم ملف code يتجاوز 256 كيلوبايت.");
    total += size;
    rejectCredentials(file.content);
    if (/\.json$/i.test(file.path)) {
      try {
        JSON.parse(file.content);
      } catch {
        throw new Error("محتوى ملف JSON غير صالح.");
      }
    }
  }
  if (total > FNN_CODE_MAX_TOTAL_BYTES) throw new Error("مجموع ملفات code يتجاوز ميغابايت واحدًا.");
  return draft;
}
export function parseFnnCodeBundle(input: unknown): FnnCodeBundle {
  const parsed = BundleSchema.safeParse(input);
  if (!parsed.success) throw new Error("حزمة code المحفوظة غير صالحة.");
  const bundle = parsed.data;
  if (Date.parse(bundle.createdAt) > Date.now() + 60_000)
    throw new Error("تاريخ حزمة code المحفوظة غير صالح.");
  const draft = parseFnnCodeDraft({ title: bundle.title, files: bundle.files });
  const total = draft.files.reduce((sum, file) => sum + fnnCodeUtf8Bytes(file.content), 0);
  const hashPaths = Object.keys(bundle.fileSha256).sort();
  if (
    total !== bundle.totalBytes ||
    JSON.stringify(hashPaths) !== JSON.stringify(draft.files.map((f) => f.path).sort())
  ) {
    throw new Error("بيانات حزمة code المحفوظة غير متطابقة.");
  }
  return bundle;
}
export async function hashFnnCodeFiles(files: FnnCodeFile[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = Object.create(null);
  for (const file of files) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(file.content));
    hashes[file.path] = Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }
  return hashes;
}
export function summarizeFnnCodeBundle(bundle: FnnCodeBundle): FnnCodeBundleSummary {
  return {
    id: bundle.id,
    title: bundle.title,
    createdAt: bundle.createdAt,
    fileCount: bundle.files.length,
    totalBytes: bundle.totalBytes,
  };
}
