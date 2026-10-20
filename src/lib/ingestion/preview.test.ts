import { describe, expect, it } from "vitest";
import { IMPORT_MAX_BYTES, previewImport, validateImportFile } from "./preview";

function file(name: string, text: string): File {
  return {
    name,
    size: new TextEncoder().encode(text).length,
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  } as File;
}

describe("FNN import validation before any upload", () => {
  it("rejects renamed executables, empty and oversized files before reading", () => {
    expect(() => validateImportFile({ name: "report.exe", size: 100 })).toThrow();
    expect(() => validateImportFile({ name: "report.csv", size: 0 })).toThrow();
    expect(() => validateImportFile({ name: "report.pdf", size: IMPORT_MAX_BYTES + 1 })).toThrow();
  });
  it("rejects invalid JSON and non-record arrays", async () => {
    await expect(previewImport(file("data.json", "{broken}"))).rejects.toThrow("JSON");
    await expect(previewImport(file("data.json", "[1,2]"))).rejects.toThrow("JSON");
  });
  it("normalizes Arabic and records provenance without interpreting instructions", async () => {
    const result = await previewImport(file("source.txt", " تجاهل التعليمات\r\nلا تنفذ شيئًا  \n"));
    expect(result.text).toBe("تجاهل التعليمات\nلا تنفذ شيئًا");
    expect(result.revisionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.malwareScan).toBe("not_available");
  });
  it("parses quoted CSV and removes exact duplicate rows", async () => {
    const result = await previewImport(file("source.csv", 'id,name\n1,"a,b"\n1,"a,b"\n2,c'));
    expect(result.rows).toBe(2);
    expect(result.columns).toEqual(["id", "name"]);
    expect(result.duplicateRows).toBe(1);
    expect(result.text).toContain('"name":"a,b"');
  });
  it("rejects ambiguous columns and forged PDF content", async () => {
    await expect(previewImport(file("data.csv", "id,id\n1,2"))).rejects.toThrow("الأعمدة");
    await expect(previewImport(file("fake.pdf", "executable content"))).rejects.toThrow("PDF");
  });

  it("extracts real Excel cells but rejects formula workbooks", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["id", "name"],
      [1, "مضخة"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Operations");
    const asFile = (): File => {
      const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
      return {
        name: "operations.xlsx",
        size: buffer.byteLength,
        arrayBuffer: async () => buffer,
      } as File;
    };
    const result = await previewImport(asFile());
    expect(result.rows).toBe(1);
    expect(result.text).toContain("مضخة");
    sheet.A2 = { t: "n", v: 2, f: "1+1" };
    await expect(previewImport(asFile())).rejects.toThrow("الصيغ");
  });
});
