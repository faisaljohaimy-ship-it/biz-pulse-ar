/**
 * Server-only, dependency-free inspection for ARIA attachments.
 *
 * This is a structural safety gate, not a replacement for an enterprise AV
 * engine. It verifies the real file signature, blocks executable/active
 * content, and inspects Office ZIP metadata for traversal and decompression
 * bombs before the object can leave quarantine.
 */

export const ARIA_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const ARIA_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
] as const;

export type AriaAttachmentMime = (typeof ARIA_ATTACHMENT_MIME_TYPES)[number];

export type FileInspectionResult = {
  detectedMime: AriaAttachmentMime;
  family: "image" | "pdf" | "audio" | "video" | "text" | "office";
  checks: string[];
};

export class FileInspectionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FileInspectionError";
  }
}

const MIME_EXTENSIONS: Record<AriaAttachmentMime, readonly string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/pdf": ["pdf"],
  "audio/mpeg": ["mp3", "mpeg"],
  "audio/wav": ["wav"],
  "audio/webm": ["webm"],
  "audio/mp4": ["m4a", "mp4"],
  "audio/ogg": ["ogg", "oga"],
  "video/mp4": ["mp4", "m4v"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov", "qt"],
  "text/plain": ["txt", "log"],
  "text/markdown": ["md", "markdown"],
  "application/json": ["json"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/csv": ["csv"],
};

const DANGEROUS_EXTENSION =
  /\.(?:ade|adp|app|apk|bat|bin|cmd|com|cpl|dll|dmg|exe|hta|inf|ins|iso|jar|js|jse|lnk|msh|msi|msp|mst|pif|ps1|reg|scr|sh|svg|sys|vb|vbe|vbs|ws|wsc|wsf)(?:\.|$)/i;

const ACTIVE_TEXT =
  /(?:<\s*(?:script|iframe|object|embed|svg|html)\b|<!doctype\s+html|javascript\s*:|data\s*:\s*text\/html)/i;
const ACTIVE_PDF = /\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction|RichMedia)\b/i;
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

function ascii(bytes: Uint8Array, start = 0, end = bytes.length): string {
  const view = bytes.subarray(start, Math.min(end, bytes.length));
  const chunks: string[] = [];
  for (let offset = 0; offset < view.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...view.subarray(offset, offset + 0x8000)));
  }
  return chunks.join("");
}

function begins(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function scanAscii(bytes: Uint8Array, matcher: (chunk: string) => boolean): boolean {
  const chunkSize = 64 * 1024;
  const overlap = 256;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const start = Math.max(0, offset - overlap);
    if (matcher(ascii(bytes, start, Math.min(bytes.length, offset + chunkSize)))) return true;
  }
  return false;
}

function u16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function assertFilename(filename: string, claimedMime: AriaAttachmentMime) {
  const normalized = filename.normalize("NFKC").trim();
  if (!normalized || normalized.startsWith(".") || /[\0\r\n/\\]/.test(normalized)) {
    throw new FileInspectionError("unsafe_filename", "Attachment filename is unsafe.");
  }
  if (DANGEROUS_EXTENSION.test(normalized)) {
    throw new FileInspectionError(
      "dangerous_extension",
      "Executable or active-content filename extensions are blocked.",
    );
  }
  const extension = normalized.includes(".") ? normalized.split(".").pop()!.toLowerCase() : "";
  if (!MIME_EXTENSIONS[claimedMime].includes(extension)) {
    throw new FileInspectionError(
      "extension_mismatch",
      "Attachment extension does not match its declared type.",
    );
  }
}

function assertNoExecutableSignature(bytes: Uint8Array) {
  const isPe = begins(bytes, [0x4d, 0x5a]);
  const isElf = begins(bytes, [0x7f, 0x45, 0x4c, 0x46]);
  const isMachO =
    begins(bytes, [0xfe, 0xed, 0xfa, 0xce]) ||
    begins(bytes, [0xfe, 0xed, 0xfa, 0xcf]) ||
    begins(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    begins(bytes, [0xca, 0xfe, 0xba, 0xbe]);
  const isScript = begins(bytes, [0x23, 0x21]);
  if (isPe || isElf || isMachO || isScript) {
    throw new FileInspectionError(
      "executable_signature",
      "Executable file signatures are blocked.",
    );
  }
}

type ZipSummary = { names: string[]; totalUncompressed: number; entries: number };

function inspectZip(bytes: Uint8Array): ZipSummary {
  const names: string[] = [];
  let totalUncompressed = 0;
  let entries = 0;

  for (let offset = 0; offset + 46 <= bytes.length; offset++) {
    if (u32(bytes, offset) !== 0x02014b50) continue;
    const flags = u16(bytes, offset + 8);
    const compressed = u32(bytes, offset + 20);
    const uncompressed = u32(bytes, offset + 24);
    const nameLength = u16(bytes, offset + 28);
    const extraLength = u16(bytes, offset + 30);
    const commentLength = u16(bytes, offset + 32);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length || nameLength === 0) {
      throw new FileInspectionError("invalid_zip", "Office archive metadata is malformed.");
    }
    if ((flags & 0x1) !== 0) {
      throw new FileInspectionError("encrypted_archive", "Encrypted Office archives are blocked.");
    }

    const name = ascii(bytes, offset + 46, offset + 46 + nameLength).replace(/\\/g, "/");
    const lower = name.toLowerCase();
    if (name.startsWith("/") || lower.includes("../") || lower.includes("\0")) {
      throw new FileInspectionError(
        "archive_traversal",
        "Unsafe Office archive paths are blocked.",
      );
    }
    if (DANGEROUS_EXTENSION.test(lower) || lower.includes("vbaproject.bin")) {
      throw new FileInspectionError(
        "active_office_content",
        "Macros or active Office content are blocked.",
      );
    }

    entries += 1;
    totalUncompressed += uncompressed;
    if (entries > 2_000 || totalUncompressed > 100 * 1024 * 1024) {
      throw new FileInspectionError(
        "archive_bomb",
        "Office archive expansion exceeds safe limits.",
      );
    }
    if (compressed === 0 ? uncompressed > 0 : uncompressed / compressed > 100) {
      throw new FileInspectionError("archive_ratio", "Office archive compression ratio is unsafe.");
    }
    names.push(lower);
    offset = end - 1;
  }

  if (entries === 0) {
    throw new FileInspectionError("invalid_zip", "Office archive has no readable directory.");
  }
  return { names, totalUncompressed, entries };
}

function inspectText(bytes: Uint8Array, mime: AriaAttachmentMime): FileInspectionResult {
  if (bytes.includes(0)) {
    throw new FileInspectionError("binary_text", "Binary data cannot be uploaded as text.");
  }
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new FileInspectionError("invalid_utf8", "Text attachments must be valid UTF-8.");
  }
  if (ACTIVE_TEXT.test(decoded)) {
    throw new FileInspectionError(
      "active_text_content",
      "Active HTML or script content is blocked.",
    );
  }
  if (mime === "application/json") {
    try {
      JSON.parse(decoded);
    } catch {
      throw new FileInspectionError("invalid_json", "JSON attachment is not valid JSON.");
    }
  }
  return { detectedMime: mime, family: "text", checks: ["utf8", "active-content"] };
}

function mismatch(): never {
  throw new FileInspectionError(
    "signature_mismatch",
    "File signature does not match its declared type.",
  );
}

export function inspectAriaAttachment(input: {
  bytes: Uint8Array;
  filename: string;
  claimedMime: string;
}): FileInspectionResult {
  const { bytes, filename, claimedMime } = input;
  if (!ARIA_ATTACHMENT_MIME_TYPES.includes(claimedMime as AriaAttachmentMime)) {
    throw new FileInspectionError("unsupported_mime", "Attachment type is not allowed.");
  }
  const mime = claimedMime as AriaAttachmentMime;
  if (bytes.length === 0 || bytes.length > ARIA_ATTACHMENT_MAX_BYTES) {
    throw new FileInspectionError("unsafe_size", "Attachment size is outside the allowed range.");
  }
  assertFilename(filename, mime);
  assertNoExecutableSignature(bytes);

  if (scanAscii(bytes, (chunk) => chunk.includes(EICAR))) {
    throw new FileInspectionError(
      "malware_signature",
      "Attachment matched a blocked malware signature.",
    );
  }

  if (mime.startsWith("text/") || mime === "application/json") {
    return inspectText(bytes, mime);
  }

  if (mime === "image/png") {
    if (!begins(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) mismatch();
    return { detectedMime: mime, family: "image", checks: ["magic"] };
  }
  if (mime === "image/jpeg") {
    if (
      !begins(bytes, [0xff, 0xd8, 0xff]) ||
      !begins(bytes.subarray(bytes.length - 2), [0xff, 0xd9])
    ) {
      mismatch();
    }
    return { detectedMime: mime, family: "image", checks: ["magic", "terminator"] };
  }
  if (mime === "image/gif") {
    const header = ascii(bytes, 0, 6);
    if (header !== "GIF87a" && header !== "GIF89a") mismatch();
    return { detectedMime: mime, family: "image", checks: ["magic"] };
  }
  if (mime === "image/webp") {
    if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WEBP") mismatch();
    return { detectedMime: mime, family: "image", checks: ["container"] };
  }
  if (mime === "application/pdf") {
    if (ascii(bytes, 0, 5) !== "%PDF-") mismatch();
    if (scanAscii(bytes, (chunk) => ACTIVE_PDF.test(chunk))) {
      throw new FileInspectionError("active_pdf", "PDF actions and embedded files are blocked.");
    }
    return { detectedMime: mime, family: "pdf", checks: ["magic", "active-content"] };
  }
  if (mime === "audio/mpeg") {
    const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
    if (ascii(bytes, 0, 3) !== "ID3" && !frame) mismatch();
    return { detectedMime: mime, family: "audio", checks: ["magic"] };
  }
  if (mime === "audio/wav") {
    if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WAVE") mismatch();
    return { detectedMime: mime, family: "audio", checks: ["container"] };
  }
  if (mime === "audio/ogg") {
    if (ascii(bytes, 0, 4) !== "OggS") mismatch();
    return { detectedMime: mime, family: "audio", checks: ["container"] };
  }
  if (mime === "audio/webm" || mime === "video/webm") {
    if (!begins(bytes, [0x1a, 0x45, 0xdf, 0xa3])) mismatch();
    return {
      detectedMime: mime,
      family: mime.startsWith("audio/") ? "audio" : "video",
      checks: ["container"],
    };
  }
  if (mime === "audio/mp4" || mime === "video/mp4" || mime === "video/quicktime") {
    if (ascii(bytes, 4, 8) !== "ftyp") mismatch();
    return {
      detectedMime: mime,
      family: mime.startsWith("audio/") ? "audio" : "video",
      checks: ["container"],
    };
  }

  if (!begins(bytes, [0x50, 0x4b, 0x03, 0x04])) mismatch();
  const zip = inspectZip(bytes);
  const hasContentTypes = zip.names.includes("[content_types].xml");
  const isDocx = zip.names.some((name) => name.startsWith("word/"));
  const isXlsx = zip.names.some((name) => name.startsWith("xl/"));
  const expectedDocx =
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (!hasContentTypes || (expectedDocx ? !isDocx || isXlsx : !isXlsx || isDocx)) mismatch();
  return {
    detectedMime: mime,
    family: "office",
    checks: ["zip-directory", "office-structure", "archive-limits"],
  };
}
