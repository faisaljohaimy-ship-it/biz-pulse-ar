/**
 * مرفقات سَدِيد — تُرسَل إلى المحادثة أجزاءَ `file` (AI SDK v5) ليقرأها
 * النموذج، والنصّية منها تُودَع أيضًا في قاعدة معرفة النظام لتُرتَّب وتُستشهد.
 */
export const SADEED_MAX_FILES = 5;
export const SADEED_MAX_FILE_BYTES = 8 * 1024 * 1024;

export const SADEED_ACCEPT =
  "image/*,application/pdf,text/plain,text/csv,text/markdown,application/json,.txt,.csv,.md,.json";

const TEXT_RE = /^(text\/|application\/json)|\.(txt|csv|md|json)$/i;

export function isTextFile(file: File): boolean {
  return TEXT_RE.test(file.type) || TEXT_RE.test(file.name);
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
  for (const f of files) {
    if (ok.length >= SADEED_MAX_FILES) rejected.push(`${f.name}: تجاوز الحد (${SADEED_MAX_FILES})`);
    else if (f.size > SADEED_MAX_FILE_BYTES) rejected.push(`${f.name}: أكبر من 8MB`);
    else ok.push(f);
  }
  return { ok, rejected };
}

export function fileToPart(file: File): Promise<SadeedFilePart> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve({
        type: "file",
        mediaType: file.type || (isTextFile(file) ? "text/plain" : "application/octet-stream"),
        filename: file.name,
        url: String(r.result),
      });
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
