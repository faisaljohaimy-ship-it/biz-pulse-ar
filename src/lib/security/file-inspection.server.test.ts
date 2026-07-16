import { describe, expect, it } from "vitest";
import { FileInspectionError, inspectAriaAttachment } from "./file-inspection.server";

const bytes = (...values: number[]) => new Uint8Array(values);

function fakeOfficeZip(names: string[]) {
  const encoder = new TextEncoder();
  const localName = encoder.encode(names[0]);
  const local = new Uint8Array(30 + localName.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(26, localName.length, true);
  local.set(localName, 30);

  const central = names.map((name) => {
    const encoded = encoder.encode(name);
    const entry = new Uint8Array(46 + encoded.length);
    const view = new DataView(entry.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(28, encoded.length, true);
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

describe("ARIA attachment structural inspection", () => {
  it("accepts a PNG only when filename, MIME, and magic agree", () => {
    const result = inspectAriaAttachment({
      bytes: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1),
      filename: "evidence.png",
      claimedMime: "image/png",
    });
    expect(result).toMatchObject({ detectedMime: "image/png", family: "image" });
  });

  it("blocks executable signatures even when renamed", () => {
    expectBlocked(
      () =>
        inspectAriaAttachment({
          bytes: bytes(0x4d, 0x5a, 0x90, 0),
          filename: "invoice.pdf",
          claimedMime: "application/pdf",
        }),
      "executable_signature",
    );
  });

  it("blocks dangerous double extensions", () => {
    expectBlocked(
      () =>
        inspectAriaAttachment({
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
        inspectAriaAttachment({
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
        inspectAriaAttachment({
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
        inspectAriaAttachment({
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
        inspectAriaAttachment({
          bytes: new TextEncoder().encode(eicar),
          filename: "diagnostic.txt",
          claimedMime: "text/plain",
        }),
      "malware_signature",
    );
  });

  it("accepts a structurally matching macro-free DOCX container", () => {
    const result = inspectAriaAttachment({
      bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml"]),
      filename: "brief.docx",
      claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(result).toMatchObject({ family: "office" });
    expect(result.checks).toContain("archive-limits");
  });

  it("blocks macros embedded in an Office container", () => {
    expectBlocked(
      () =>
        inspectAriaAttachment({
          bytes: fakeOfficeZip(["[Content_Types].xml", "word/document.xml", "word/vbaProject.bin"]),
          filename: "brief.docx",
          claimedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      "active_office_content",
    );
  });
});
