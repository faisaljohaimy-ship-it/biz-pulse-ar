import {
  KNOWLEDGE_MAX_TEXT_CHARS,
  normalizeKnowledgeText,
  knowledgeRevisionHash,
} from "@/lib/sadeed/knowledge-ingest-core";

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;
export const IMPORT_ACCEPT = ".pdf,.docx,.xlsx,.csv,.json,.txt,.md";
export interface ImportPreview {
  text: string;
  pages: number;
  rows: number | null;
  columns: string[];
  duplicateRows: number;
  revisionHash: string;
  malwareScan: "not_available";
}

export function validateImportFile(file: { name: string; size: number }): string {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!IMPORT_ACCEPT.split(",").includes(`.${extension}`))
    throw new Error("نوع الملف غير مدعوم. استخدم PDF أو DOCX أو XLSX أو CSV أو JSON أو TXT.");
  if (!file.size || file.size > IMPORT_MAX_BYTES)
    throw new Error("اختر ملفًا غير فارغ لا يتجاوز ١٠ ميجابايت.");
  return extension;
}

/** Preview only: never executes formulas, follows URLs, uploads or writes data. */
export async function previewImport(file: File): Promise<ImportPreview> {
  const extension = validateImportFile(file);
  let text = "";
  let pages = 0;
  let rows: number | null = null;
  let columns: string[] = [];
  let duplicateRows = 0;
  if (extension === "pdf") {
    const buffer = await file.arrayBuffer();
    if (new TextDecoder().decode(buffer.slice(0, 5)) !== "%PDF-")
      throw new Error("محتوى الملف لا يطابق صيغة PDF.");
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdfjs.getDocument({ data: buffer });
    try {
      const doc = await task.promise;
      pages = doc.numPages;
      if (pages > 300) throw new Error("قسّم المستند إلى ملفات لا تتجاوز ٣٠٠ صفحة.");
      for (let p = 1; p <= pages; p++) {
        const content = await (await doc.getPage(p)).getTextContent();
        text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n\n";
        if (text.length > KNOWLEDGE_MAX_TEXT_CHARS)
          throw new Error("النص يتجاوز حد المعالجة. قسّم الملف.");
      }
    } finally {
      await task.destroy();
    }
  } else if (extension === "docx") {
    const buffer = await file.arrayBuffer();
    if (new Uint8Array(buffer)[0] !== 0x50 || new Uint8Array(buffer)[1] !== 0x4b)
      throw new Error("محتوى الملف لا يطابق صيغة Word.");
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
  } else if (extension === "csv" || extension === "xlsx") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(extension === "csv" ? await file.text() : await file.arrayBuffer(), {
      type: extension === "csv" ? "string" : "array",
      raw: true,
      cellFormula: true,
      sheetRows: IMPORT_MAX_ROWS + 2,
    });
    const sections: string[] = [];
    rows = 0;
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const range = sheet["!fullref"] ?? sheet["!ref"];
      if (
        range &&
        (XLSX.utils.decode_range(range).e.r > IMPORT_MAX_ROWS ||
          XLSX.utils.decode_range(range).e.c >= 100)
      )
        throw new Error("الحد الأقصى ٥٠٠٠ صف و١٠٠ عمود لكل ملف.");
      if (Object.values(sheet).some((cell) => cell && typeof cell === "object" && "f" in cell))
        throw new Error("صدّر الجدول كقيم فقط قبل الاستيراد؛ الصيغ غير مقبولة.");
      const table = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      if (!table.length) continue;
      const header = table[0].map((v) => String(v).normalize("NFC").trim());
      if (header.some((h) => !h) || new Set(header).size !== header.length)
        throw new Error("أسماء الأعمدة يجب أن تكون غير فارغة وغير مكررة.");
      columns = [...new Set([...columns, ...header])];
      const seen = new Set<string>();
      const normalized: string[] = [];
      for (const row of table.slice(1)) {
        if (row.length > header.length) throw new Error("صف يحتوي أعمدة أكثر من العناوين.");
        const values = header.map((_, i) =>
          String(row[i] ?? "")
            .normalize("NFC")
            .trim(),
        );
        if (!values.some(Boolean)) continue;
        const key = JSON.stringify(values);
        if (seen.has(key)) {
          duplicateRows++;
          continue;
        }
        seen.add(key);
        rows++;
        if (rows > IMPORT_MAX_ROWS) throw new Error("تجاوز الملف حد ٥٠٠٠ صف.");
        normalized.push(JSON.stringify(Object.fromEntries(header.map((h, i) => [h, values[i]]))));
      }
      sections.push(`${name}\n${normalized.join("\n")}`);
    }
    text = sections.join("\n\n");
  } else {
    text = await file.text();
    if (extension === "json") {
      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch {
        throw new Error("صيغة JSON غير صحيحة.");
      }
      if (!value || typeof value !== "object")
        throw new Error("يجب أن يحتوي JSON كائنًا أو مصفوفة سجلات.");
      if (Array.isArray(value)) {
        if (value.length > IMPORT_MAX_ROWS) throw new Error("تجاوز الملف حد ٥٠٠٠ صف.");
        if (value.some((row) => !row || typeof row !== "object" || Array.isArray(row)))
          throw new Error("يجب أن تكون جميع صفوف JSON كائنات.");
        rows = value.length;
        columns = [...new Set(value.flatMap((row) => Object.keys(row)))];
      } else columns = Object.keys(value);
      if (columns.length > 100) throw new Error("تجاوز الملف حد ١٠٠ عمود.");
      text = JSON.stringify(value, null, 2);
    }
  }
  text = normalizeKnowledgeText(text);
  if (!text || text.includes("\u0000"))
    throw new Error("لا يوجد نص صالح للمعالجة؛ قد يحتاج المستند إلى استخراج ضوئي.");
  if (text.length > KNOWLEDGE_MAX_TEXT_CHARS)
    throw new Error("النص يتجاوز حد المعالجة. قسّم الملف.");
  return {
    text,
    pages,
    rows,
    columns,
    duplicateRows,
    revisionHash: await knowledgeRevisionHash(text),
    malwareScan: "not_available",
  };
}
