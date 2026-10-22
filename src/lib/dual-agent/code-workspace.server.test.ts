// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "./command.server";
vi.mock("./owner.server", () => ({ requireFnnOwner: vi.fn() }));
vi.mock("./command.server", () => ({ resolveCommandOrg: vi.fn() }));
import { requireFnnOwner } from "./owner.server";
import { resolveCommandOrg } from "./command.server";
import { listCodeBundles, readCodeBundle, saveCodeBundle } from "./code-workspace.server";
import {
  FNN_CODE_ORG_ID,
  FNN_CODE_MAX_BUNDLE_BYTES,
  hashFnnCodeFiles,
  fnnCodeUtf8Bytes,
  type FnnCodeBundle,
} from "./code-workspace";
const USER = "20000000-0000-4000-8000-000000000001";
const ID = "10000000-0000-4000-8000-000000000001";
const draft = {
  title: "مسودة code",
  files: [{ path: "src/hello.ts", content: 'export const hello = "مرحبًا";\n' }],
};
const upload = vi.fn();
const list = vi.fn();
const asStream = vi.fn();
const download = vi.fn(() => ({ asStream }));
const from = vi.fn(() => ({ upload, list, download }));
const context = { userId: USER, supabase: { storage: { from } } } as unknown as CommandContext;
let bundle: FnnCodeBundle;
function stream(text: string | Uint8Array) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(typeof text === "string" ? new TextEncoder().encode(text) : text);
      controller.close();
    },
  });
}
beforeEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireFnnOwner).mockResolvedValue(undefined);
  vi.mocked(resolveCommandOrg).mockResolvedValue(FNN_CODE_ORG_ID);
  bundle = {
    ...draft,
    version: 1,
    id: ID,
    ownerId: USER,
    orgId: FNN_CODE_ORG_ID,
    createdAt: new Date().toISOString(),
    totalBytes: fnnCodeUtf8Bytes(draft.files[0].content),
    fileSha256: await hashFnnCodeFiles(draft.files),
  };
  upload.mockImplementation(async (path) => ({ data: { path }, error: null }));
  asStream.mockImplementation(async () => ({ data: stream(JSON.stringify(bundle)), error: null }));
  list.mockResolvedValue({ data: [{ name: `${ID}.json` }], error: null });
});
describe("owner-only persisted inert code workspace", () => {
  it.each(["list", "read", "save"])(
    "denies %s before any storage or tenant request when owner verification fails",
    async (operation) => {
      vi.mocked(requireFnnOwner).mockRejectedValue(new Error("مالك النظام فقط"));
      const task =
        operation === "list"
          ? listCodeBundles(context)
          : operation === "read"
            ? readCodeBundle(context, { id: ID })
            : saveCodeBundle(context, draft);
      await expect(task).rejects.toThrow(/مالك/);
      expect(resolveCommandOrg).not.toHaveBeenCalled();
      expect(from).not.toHaveBeenCalled();
    },
  );
  it("revalidates fixed-org membership before touching storage", async () => {
    vi.mocked(resolveCommandOrg).mockRejectedValue(new Error("عضوية مفقودة"));
    await expect(saveCodeBundle(context, draft)).rejects.toThrow(/عضوية/);
    expect(resolveCommandOrg).toHaveBeenCalledWith(context, FNN_CODE_ORG_ID);
    expect(from).not.toHaveBeenCalled();
  });
  it("creates a new private UUID JSON object with no overwrite, source write, or public URL", async () => {
    const result = await saveCodeBundle(context, draft);
    expect(from).toHaveBeenCalledWith("aria-documents");
    const [path, bytes, options] = upload.mock.calls[0];
    expect(path).toBe(`${USER}/fnn-code/${result.id}.json`);
    expect(options).toMatchObject({
      upsert: false,
      contentType: "application/json; charset=utf-8",
      cacheControl: "0",
    });
    const stored = JSON.parse(new TextDecoder().decode(bytes));
    expect(stored).toMatchObject({
      ownerId: USER,
      orgId: FNN_CODE_ORG_ID,
      title: draft.title,
      files: draft.files,
    });
    expect(stored.fileSha256).toEqual(await hashFnnCodeFiles(draft.files));
    expect(result).toEqual({
      id: stored.id,
      title: draft.title,
      createdAt: stored.createdAt,
      fileCount: 1,
      totalBytes: stored.totalBytes,
    });
    expect(result).not.toHaveProperty("url");
    expect(download).not.toHaveBeenCalled();
  });
  it("rejects caller-supplied paths/identities and invalid IDs instead of forwarding them", async () => {
    await expect(
      saveCodeBundle(context, { ...draft, path: "other/fnn-code/file.json" }),
    ).rejects.toThrow();
    await expect(readCodeBundle(context, { id: "../other.json" })).rejects.toThrow(/معرّف/);
    await expect(readCodeBundle(context, { id: ID, ownerId: "other" })).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
  it("reads only the owner's fixed prefix through the authenticated context", async () => {
    expect(await readCodeBundle(context, { id: ID })).toEqual(bundle);
    expect(download).toHaveBeenCalledWith(
      `${USER}/fnn-code/${ID}.json`,
      {},
      expect.objectContaining({ signal: expect.any(AbortSignal), cache: "no-store" }),
    );
    expect(requireFnnOwner).toHaveBeenCalledWith(context);
  });
  it.each(["owner", "org", "hash", "bytes", "json", "utf8", "size"])(
    "fails closed on persisted %s mismatch",
    async (invalid) => {
      let stored: string | Uint8Array = JSON.stringify(bundle);
      if (invalid === "owner") stored = JSON.stringify({ ...bundle, ownerId: ID });
      if (invalid === "org") stored = JSON.stringify({ ...bundle, orgId: ID });
      if (invalid === "hash")
        stored = JSON.stringify({
          ...bundle,
          files: [{ ...bundle.files[0], content: "tampered" }],
          totalBytes: 8,
        });
      if (invalid === "bytes") stored = JSON.stringify({ ...bundle, totalBytes: 1 });
      if (invalid === "json") stored = "{invalid}";
      if (invalid === "utf8") stored = new Uint8Array([0xff]);
      if (invalid === "size") stored = new Uint8Array(FNN_CODE_MAX_BUNDLE_BYTES + 1);
      asStream.mockResolvedValue({ data: stream(stored), error: null });
      await expect(readCodeBundle(context, { id: ID })).rejects.toThrow(/التحقق/);
    },
  );
  it("bounds the list page and validates persisted content before revealing summaries", async () => {
    expect(await listCodeBundles(context)).toEqual({
      bundles: [
        {
          id: ID,
          title: draft.title,
          createdAt: bundle.createdAt,
          fileCount: 1,
          totalBytes: bundle.totalBytes,
        },
      ],
      sampleLimit: 10,
    });
    expect(list).toHaveBeenCalledWith(
      `${USER}/fnn-code`,
      { limit: 10, offset: 0, sortBy: { column: "created_at", order: "desc" } },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    list.mockResolvedValue({ data: [{ name: "../outside.json" }], error: null });
    await expect(listCodeBundles(context)).rejects.toThrow(/تحميل/);
  });
  it("does not disclose backend errors or report unconfirmed uploads as saved", async () => {
    upload.mockResolvedValue({ data: null, error: { message: "sensitive backend detail" } });
    await expect(saveCodeBundle(context, draft)).rejects.toThrow("لم يتأكد حفظ حزمة code");
    asStream.mockRejectedValue(new Error("sensitive backend detail"));
    await expect(readCodeBundle(context, { id: ID })).rejects.toThrow("تعذّر التحقق");
    list.mockRejectedValue(new Error("sensitive backend detail"));
    await expect(listCodeBundles(context)).rejects.toThrow("تعذّر تحميل");
  });
  it("times out a late upload without retrying it or declaring success", async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    let finish!: (value: unknown) => void;
    upload.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const saving = saveCodeBundle(context, draft);
    const assertion = expect(saving).rejects.toThrow(/لم يتأكد/);
    await vi.waitFor(() => expect(upload).toHaveBeenCalledOnce());
    controller.abort();
    await assertion;
    finish({ data: { path: upload.mock.calls[0][0] }, error: null });
    await Promise.resolve();
    expect(upload).toHaveBeenCalledOnce();
  });
});
