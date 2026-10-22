// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  FNN_CODE_ORG_ID,
  FNN_CODE_MAX_FILE_BYTES,
  FNN_CODE_MAX_TOTAL_BYTES,
  parseFnnCodeDraft,
  parseFnnCodeBundle,
  fnnCodeUtf8Bytes,
  hashFnnCodeFiles,
} from "./code-workspace";
const draft = {
  title: "مسودة code",
  files: [{ path: "src/example.ts", content: 'export const greeting = "مرحبًا";\n' }],
};
describe("private inert code bundle validation", () => {
  it("accepts safe Arabic UTF-8 source and validates JSON contents without executing them", () => {
    expect(parseFnnCodeDraft(draft)).toEqual(draft);
    expect(fnnCodeUtf8Bytes("أ")).toBe(2);
    expect(
      parseFnnCodeDraft({ ...draft, files: [{ path: "config.json", content: '{"value":1}' }] })
        .files,
    ).toHaveLength(1);
  });
  it.each([
    "../file.ts",
    "/tmp/file.ts",
    "C:/file.ts",
    "src\\file.ts",
    "src//file.ts",
    "./file.ts",
    "src/../file.ts",
    "%2e%2e/file.ts",
    "src/file.ts ",
    "NUL.ts",
    "src/.git/config.json",
    ".env",
    ".env.example",
    "credentials.json",
    "secrets/config.json",
    "id_rsa.txt",
    "signing.pem",
    "image.png",
    "code.exe",
  ])("rejects unsafe/secret/nontext path %s", (path) => {
    expect(() => parseFnnCodeDraft({ ...draft, files: [{ path, content: "safe" }] })).toThrow();
  });
  it.each(["\u0000", "\ud800", "\u202e"])("rejects nontext or malformed text %j", (bad) => {
    expect(() =>
      parseFnnCodeDraft({ ...draft, files: [{ path: "test.ts", content: bad }] }),
    ).toThrow();
    expect(() =>
      parseFnnCodeDraft({ ...draft, files: [{ path: `src/${bad}.ts`, content: "safe" }] }),
    ).toThrow();
  });
  it("rejects invalid JSON, duplicate paths, unknown input fields and excessive counts", () => {
    expect(() =>
      parseFnnCodeDraft({ ...draft, files: [{ path: "bad.json", content: "{bad}" }] }),
    ).toThrow(/JSON/);
    expect(() =>
      parseFnnCodeDraft({
        ...draft,
        files: [draft.files[0], { ...draft.files[0], path: "SRC/EXAMPLE.TS" }],
      }),
    ).toThrow(/تكرر/);
    expect(() => parseFnnCodeDraft({ ...draft, ownerId: "someone" })).toThrow();
    expect(() =>
      parseFnnCodeDraft({
        ...draft,
        files: Array.from({ length: 11 }, (_, i) => ({ path: `file${i}.ts`, content: "" })),
      }),
    ).toThrow();
  });
  it("enforces byte limits rather than UTF-16 string lengths", () => {
    expect(() =>
      parseFnnCodeDraft({
        ...draft,
        files: [{ path: "big.txt", content: "أ".repeat(FNN_CODE_MAX_FILE_BYTES / 2 + 1) }],
      }),
    ).toThrow(/256/);
    const files = Array.from(
      { length: FNN_CODE_MAX_TOTAL_BYTES / FNN_CODE_MAX_FILE_BYTES + 1 },
      (_, i) => ({ path: `${i}.txt`, content: "a".repeat(FNN_CODE_MAX_FILE_BYTES) }),
    );
    expect(() => parseFnnCodeDraft({ ...draft, files })).toThrow(/ميغابايت/);
  });
  it.each([
    "-----BEGIN " + "PRIVATE KEY-----\nexample\n-----END PRIVATE KEY-----",
    "sk" + "-" + "x".repeat(30),
    'const password = "a-hardcoded-value";',
    '{"client_secret":"a-hardcoded-value"}',
  ])("rejects credential material", (content) => {
    expect(() => parseFnnCodeDraft({ ...draft, files: [{ path: "file.ts", content }] })).toThrow(
      /الأسرار/,
    );
  });
  it("stores deterministic SHA256 evidence and rejects mismatched manifests/future bundles", async () => {
    const hashes = await hashFnnCodeFiles([{ path: "test.txt", content: "abc" }]);
    expect(hashes["test.txt"]).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    const bundle = {
      ...draft,
      version: 1,
      id: "10000000-0000-4000-8000-000000000001",
      ownerId: "20000000-0000-4000-8000-000000000001",
      orgId: FNN_CODE_ORG_ID,
      createdAt: new Date().toISOString(),
      totalBytes: fnnCodeUtf8Bytes(draft.files[0].content),
      fileSha256: await hashFnnCodeFiles(draft.files),
    };
    expect(parseFnnCodeBundle(bundle)).toEqual(bundle);
    expect(() => parseFnnCodeBundle({ ...bundle, totalBytes: 1 })).toThrow();
    expect(() => parseFnnCodeBundle({ ...bundle, fileSha256: {} })).toThrow();
    expect(() =>
      parseFnnCodeBundle({ ...bundle, createdAt: new Date(Date.now() + 120_000).toISOString() }),
    ).toThrow(/تاريخ/);
  });
});
