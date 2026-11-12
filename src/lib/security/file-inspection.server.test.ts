import { describe, expect, it } from "vitest";
import { FileInspectionError, inspectSadeedAttachment } from "./file-inspection.server";

const bytes = (...values: number[]) => new Uint8Array(values);

function fakeOfficeZip(names: string[], unixMember?: { name: string; mode: number }) {
  const encoder = new TextEncoder();
  const localName = encoder.encode(names[0]);
  const local = new Uint8Array(30 + localName.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(6, 0x0800, true); // ZIP UTF-8 member names
  localView.setUint16(26, localName.length, true);
  local.set(localName, 30);

  const central = names.map((name) => {
    const encoded = encoder.encode(name);
    const entry = new Uint8Array(46 + encoded.length);
    const view = new DataView(entry.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(28, encoded.length, true);
    if (unixMember?.name === name) {
      entry[5] = 3; // Member created on Unix
      view.setUint32(38, (unixMember.mode << 16) >>> 0, true);
    }
    entry.set(encoded, 46);
    return entry;
  });
  const total = local.length + central.reduce((sum, entry) => sum + entry.length, 0);
  const result = new Uint8Array(total);
  result.set(local, 0);
  let offset = local.length;
  for (const entry of central) {
    result.set(entry, offset);
    offset += entry.length;
  }
  return result;
}

function expectBlocked(run: () => unknown, code: string) {
  try {
    run();
    throw new Error("expected inspection to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(FileInspectionError);
    expect((error as FileInspectionError).code).toBe(code);
  }
}

describe("SADEED attachment structural inspection", () => {
  it("accepts a PNG only when filename, MIME, and magic agree", () => {
    const result = inspectSadeedAttachment({
      bytes: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1),
      filename: "evidence.png",
      claimedMime: "image/png",
    });
    expect(result).toMatchObject({ detectedMime: "image/png", family: "image" });
  });

  it("blocks executable signatures even when renamed", () => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: bytes(0x4d, 0x5a, 0x90, 0),
          filename: "invoice.pdf",
          claimedMime: "application/pdf",
        }),
      "executable_signature",
    );
  });

  it.each([
    "incident\u202Egnp.txt",
    "incident\u202Dgnp.txt",
    "incident\u2066gnp.txt",
    "incident\u2069gnp.txt",
    "incident\u200Fgnp.txt",
    "incident\u061Cgnp.txt",
  ])("rejects bidirectional control characters in attachment filename %s", (filename) => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: new TextEncoder().encode("safe incident note"),
          filename,
          claimedMime: "text/plain",
        }),
      "unsafe_filename",
    );
  });

  it.each([
    "gate\u001b[31m-report.txt",
    "incident\tinternal.txt",
    "archive\u0007bell.txt",
    "panel\u007fstatus.txt",
    "audit\u0085note.txt",
  ])("rejects ASCII and C1 control characters in attachment filename %s", (filename) => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: new TextEncoder().encode("safe incident note"),
          filename,
          claimedMime: "text/plain",
        }),
      "unsafe_filename",
    );
  });

  it("continues accepting legitimate Arabic evidence filenames", () => {
    const result = inspectSadeedAttachment({
      bytes: new TextEncoder().encode("نص تقرير السلامة"),
      filename: "محضر-الأمن-الصناعي.txt",
      claimedMime: "text/plain",
    });
    expect(result).toMatchObject({ family: "text", detectedMime: "text/plain" });
  });

  it("blocks dangerous double extensions", () => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: bytes(0x25, 0x50, 0x44, 0x46, 0x2d),
          filename: "invoice.exe.pdf",
          claimedMime: "application/pdf",
        }),
      "dangerous_extension",
    );
  });

  it("blocks active PDF actions", () => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: new TextEncoder().encode("%PDF-1.7\n1 0 obj <</OpenAction 2 0 R>>"),
          filename: "brief.pdf",
          claimedMime: "application/pdf",
        }),
      "active_pdf",
    );
  });

  it("blocks active HTML disguised as text", () => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: new TextEncoder().encode('<script src="https://attacker.test/x.js"></script>'),
          filename: "notes.txt",
          claimedMime: "text/plain",
        }),
      "active_text_content",
    );
  });

  it("validates JSON rather than trusting the browser MIME", () => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: new TextEncoder().encode("{invalid}"),
          filename: "data.json",
          claimedMime: "application/json",
        }),
      "invalid_json",
    );
  });

  it("blocks the EICAR test signature", () => {
    const eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: new TextEncoder().encode(eicar),
          filename: "diagnostic.txt",
          claimedMime: "text/plain",
        }),
      "malware_signature",
    );
  });

  it("accepts a structurally matching macro-free DOCX container", () => {
    const result = inspectSadeedAttachment({
      bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml"]),
      filename: "brief.docx",
      claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(result).toMatchObject({ family: "office" });
    expect(result.checks).toContain("archive-limits");
  });

  it("blocks terminal parent paths and Windows-rooted Office ZIP entries", () => {
    for (const unsafePath of [
      "word/..",
      "C:/word/document.xml",
      "C:\\word\\document.xml",
      "word/report../evil.xml",
    ]) {
      expectBlocked(
        () =>
          inspectSadeedAttachment({
            bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml", unsafePath]),
            filename: "brief.docx",
            claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
        "archive_traversal",
      );
    }
  });

  it.each([
    ["identical part names", "word/document.xml"],
    ["case-insensitive part aliases", "WORD/DOCUMENT.XML"],
    ["backslash path aliases", "word\\document.xml"],
  ])("blocks %s in Office ZIP central-directory entries", (_kind, alias) => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml", alias]),
          filename: "brief.docx",
          claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      "invalid_zip",
    );
  });

  it.each([
    ["ANSI control characters", "word/\u001b[31mreport.xml", "invalid_zip"],
    ["C1 control characters", "word/\u0085report.xml", "invalid_zip"],
    ["Unicode bidi overrides", "word/\u202Ereport.xml", "invalid_zip"],
    ["NFKC-hidden executable extensions", "word/loader．ＥＸＥ", "active_office_content"],
    ["NFKC-equivalent aliases", "WORD/ｄocument.xml", "invalid_zip"],
  ])("rejects %s in Office ZIP member names", (_case, member, code) => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml", member]),
          filename: "brief.docx",
          claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      code,
    );
  });

  it("accepts normal Unicode Office part names without direction controls", () => {
    const result = inspectSadeedAttachment({
      bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml", "word/ملاحظة.xml"]),
      filename: "brief.docx",
      claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(result.family).toBe("office");
  });

  it.each([
    ["symbolic link", 0xa1ff],
    ["named pipe", 0x11a4],
    ["socket", 0xc1ff],
    ["block device", 0x61ff],
  ])("blocks %s encoded as an Office ZIP member", (_kind, mode) => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml"], {
            name: "word/document.xml",
            mode,
          }),
          filename: "brief.docx",
          claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      "invalid_zip",
    );
  });

  it("allows ordinary Unix regular-file ZIP members", () => {
    const result = inspectSadeedAttachment({
      bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml"], {
        name: "word/document.xml",
        mode: 0x81a4,
      }),
      filename: "brief.docx",
      claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(result.family).toBe("office");
  });

  it("allows ordinary Unix directory ZIP members", () => {
    const result = inspectSadeedAttachment({
      bytes: fakeOfficeZip(["[Content_Types].xml", "word/", "word/document.xml"], {
        name: "word/",
        mode: 0x41ed,
      }),
      filename: "brief.docx",
      claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(result.family).toBe("office");
  });

  it("blocks macros embedded in an Office container", () => {
    expectBlocked(
      () =>
        inspectSadeedAttachment({
          bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml", "word/vbaProject.bin"]),
          filename: "brief.docx",
          claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      "active_office_content",
    );
  });
});
