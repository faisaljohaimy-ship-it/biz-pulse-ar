/** Local-file validation only. A valid header is NOT proof of a decoded video. */
export const MAX_LOCAL_MP4_BYTES = 200 * 1024 * 1024;

export type LocalVideoCandidate = { name: string; type: string; size: number };
export type LocalVideoProblem = "unsupported_type" | "empty_file" | "file_too_large";

export function localMp4Problem(file: LocalVideoCandidate): LocalVideoProblem | null {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return "empty_file";
  if (file.size > MAX_LOCAL_MP4_BYTES) return "file_too_large";
  if (!/\.mp4$/i.test(file.name) || (file.type !== "" && file.type.toLowerCase() !== "video/mp4")) {
    return "unsupported_type";
  }
  return null;
}

/** Require a normal ISO BMFF ftyp box; the browser still must decode a frame. */
export function hasMp4FileType(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 16) return false;
  const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  const ascii = (start: number) => String.fromCharCode(...bytes.subarray(start, start + 4));
  return (
    size >= 16 &&
    ascii(4) === "ftyp" &&
    /^(?:isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)$/.test(ascii(8))
  );
}

export function hasDecodedVideoFrame(video: {
  readyState: number;
  videoWidth: number;
  videoHeight: number;
  duration: number;
}): boolean {
  return (
    Number.isInteger(video.readyState) &&
    video.readyState >= 2 &&
    video.readyState <= 4 &&
    Number.isInteger(video.videoWidth) &&
    video.videoWidth > 0 &&
    Number.isInteger(video.videoHeight) &&
    video.videoHeight > 0 &&
    Number.isFinite(video.duration) &&
    video.duration > 0
  );
}
