import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  SADEED_ACCEPT,
  SADEED_MAX_TOTAL_BYTES,
  isTextFile,
  serverMediaType,
  validateFiles,
} from "./sadeed-attachments";

const f = (name: string, type: string, size: number) => ({ name, type, size }) as unknown as File;
const MB = 1024 * 1024;

describe("مرفقات سَدِيد — مرآة حارس الخادم", () => {
  const guard = readFileSync("src/routes/api/-chat-guard.ts", "utf8");
  const serverTypes = [...guard.matchAll(/^\s+"([a-z]+\/[a-z.+-]+)",$/gm)].map((m) => m[1]);

  it("كل نوع يرسله العميل يقبله الخادم", () => {
    expect(serverTypes.length).toBeGreaterThanOrEqual(8);
    const clientTypes = SADEED_ACCEPT.split(",").filter((t) => t.includes("/"));
    expect(clientTypes.length).toBeGreaterThanOrEqual(8);
    for (const t of clientTypes) expect(serverTypes, t).toContain(t);
    expect(SADEED_ACCEPT).not.toContain("image/*");
  });

  it("الامتداد يصحّح نوع المتصفح الخاطئ أو الفارغ", () => {
    expect(serverMediaType(f("a.csv", "application/vnd.ms-excel", 1))).toBe("text/csv");
    expect(serverMediaType(f("notes.md", "", 1))).toBe("text/markdown");
    expect(serverMediaType(f("x.PNG", "", 1))).toBe("image/png");
    expect(serverMediaType(f("a.gif", "image/gif", 1))).toBeNull();
    expect(serverMediaType(f("a.heic", "image/heic", 1))).toBeNull();
    expect(isTextFile(f("a.csv", "application/vnd.ms-excel", 1))).toBe(true);
    expect(isTextFile(f("a.pdf", "application/pdf", 1))).toBe(false);
  });

  it("المجموع بعد base64 يبقى تحت سقف جسم الطلب في الخادم", () => {
    const bodyCap = 24 * 1024 * 1024;
    expect(guard).toContain("const MAX_REQUEST_BYTES = 24 * 1024 * 1024;");
    expect(Math.ceil(SADEED_MAX_TOTAL_BYTES / 3) * 4).toBeLessThan(bodyCap * 0.95);
  });

  it("يرفض الملف الفارغ (الخادم يرفض data URL فارغًا)", () => {
    expect(validateFiles([f("empty.txt", "text/plain", 0)]).rejected).toEqual([
      "empty.txt: ملفٌّ فارغ",
    ]);
  });

  it("يرفض غير المدعوم والكبير وما يتجاوز المجموع، بأسباب عربية", () => {
    const { ok, rejected } = validateFiles([
      f("a.pdf", "application/pdf", 7 * MB),
      f("b.gif", "image/gif", 1),
      f("c.pdf", "application/pdf", 9 * MB),
      f("d.png", "image/png", 7 * MB),
      f("e.png", "image/png", 3 * MB),
    ]);
    expect(ok.map((x) => x.name)).toEqual(["a.pdf", "d.png"]);
    expect(rejected).toEqual([
      "b.gif: نوعٌ غير مدعوم",
      "c.pdf: أكبر من 8MB",
      "e.png: مجموع المرفقات يتجاوز 16MB",
    ]);
  });
});
