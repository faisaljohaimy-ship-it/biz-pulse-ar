// Private inert bundles only. Never writes a source tree, executes code, or deploys.
import { requireFnnOwner } from "./owner.server";
import { resolveCommandOrg, type CommandContext } from "./command.server";
import { z } from "zod";
import {
  FNN_CODE_ORG_ID,
  FNN_CODE_MAX_BUNDLE_BYTES,
  FNN_CODE_LIST_LIMIT,
  fnnCodeUtf8Bytes,
  parseFnnCodeDraft,
  parseFnnCodeBundle,
  hashFnnCodeFiles,
  summarizeFnnCodeBundle,
  type FnnCodeBundle,
} from "./code-workspace";

const BUCKET = "aria-documents";
const DEADLINE_MS = 3500;
const IdInput = z.object({ id: z.string().uuid() }).strict();

async function scope(context: CommandContext): Promise<string> {
  await requireFnnOwner(context);
  const org = await resolveCommandOrg(context, FNN_CODE_ORG_ID);
  if (org !== FNN_CODE_ORG_ID || !z.string().uuid().safeParse(context.userId).success) {
    throw new Error("مساحة code غير متاحة لهذا الحساب.");
  }
  return `${context.userId}/fnn-code`;
}

async function bounded<T>(operation: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error("تعذّر إكمال طلب code في الوقت المحدد.");
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => {
        abort = () => reject(new Error("تعذّر إكمال طلب code في الوقت المحدد."));
        signal.addEventListener("abort", abort, { once: true });
      }),
    ]);
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
  }
}
async function load(
  context: CommandContext,
  prefix: string,
  id: string,
  signal: AbortSignal,
): Promise<FnnCodeBundle> {
  let reader: ReadableStreamDefaultReader<unknown> | undefined;
  try {
    const { data, error } = await bounded(
      context.supabase.storage
        .from(BUCKET)
        .download(`${prefix}/${id}.json`, {}, { signal, cache: "no-store" })
        .asStream(),
      signal,
    );
    if (error || !data) throw new Error("تعذّر قراءة حزمة code المحفوظة.");
    reader = data.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let text = "";
    let size = 0;
    while (true) {
      const part = await bounded(reader.read(), signal);
      if (part.done) break;
      if (!(part.value instanceof Uint8Array)) throw new Error("Invalid stream");
      size += part.value.byteLength;
      if (size > FNN_CODE_MAX_BUNDLE_BYTES) throw new Error("Oversized bundle");
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    const bundle = parseFnnCodeBundle(JSON.parse(text));
    if (bundle.id !== id || bundle.ownerId !== context.userId || bundle.orgId !== FNN_CODE_ORG_ID) {
      throw new Error("Wrong bundle scope");
    }
    const hashes = await hashFnnCodeFiles(bundle.files);
    if (bundle.files.some((file) => hashes[file.path] !== bundle.fileSha256[file.path])) {
      throw new Error("Content fingerprint mismatch");
    }
    return bundle;
  } catch {
    throw new Error("تعذّر التحقق من حزمة code المحفوظة. لم تُفتح محتوياتها.");
  } finally {
    if (reader) void reader.cancel().catch(() => undefined);
  }
}

export async function saveCodeBundle(context: CommandContext, input: unknown) {
  const prefix = await scope(context);
  const draft = parseFnnCodeDraft(input);
  const bundle: FnnCodeBundle = {
    ...draft,
    version: 1,
    id: crypto.randomUUID(),
    ownerId: context.userId,
    orgId: FNN_CODE_ORG_ID,
    createdAt: new Date().toISOString(),
    totalBytes: draft.files.reduce((sum, file) => sum + fnnCodeUtf8Bytes(file.content), 0),
    fileSha256: await hashFnnCodeFiles(draft.files),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(bundle));
  if (bytes.byteLength > FNN_CODE_MAX_BUNDLE_BYTES)
    throw new Error("حجم حزمة JSON المحفوظة يتجاوز ميغابايتين.");
  const path = `${prefix}/${bundle.id}.json`;
  try {
    const { data, error } = await bounded(
      context.supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: "application/json; charset=utf-8",
        cacheControl: "0",
        upsert: false,
      }),
      AbortSignal.timeout(DEADLINE_MS),
    );
    if (error || data?.path !== path) throw new Error("Unconfirmed save");
  } catch {
    // A timeout may follow a committed upload. Do not retry or overwrite it.
    throw new Error("لم يتأكد حفظ حزمة code. حدّث القائمة للتحقق قبل إعادة الحفظ.");
  }
  return summarizeFnnCodeBundle(bundle);
}
export async function readCodeBundle(context: CommandContext, input: unknown) {
  const prefix = await scope(context);
  const parsed = IdInput.safeParse(input);
  if (!parsed.success) throw new Error("معرّف حزمة code غير صالح.");
  return load(context, prefix, parsed.data.id, AbortSignal.timeout(DEADLINE_MS));
}
export async function listCodeBundles(context: CommandContext) {
  const prefix = await scope(context);
  const signal = AbortSignal.timeout(DEADLINE_MS);
  try {
    const { data, error } = await bounded(
      context.supabase.storage.from(BUCKET).list(
        prefix,
        {
          limit: FNN_CODE_LIST_LIMIT,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        },
        { signal, cache: "no-store" },
      ),
      signal,
    );
    if (error || !Array.isArray(data) || data.length > FNN_CODE_LIST_LIMIT)
      throw new Error("تعذّر تحميل حزم code المحفوظة.");
    // One bounded page; validate every bundle before exposing any title/summary.
    const bundles = await Promise.all(
      data.map(async (file) => {
        const match = /^([a-f0-9-]+)\.json$/.exec(file.name);
        if (!match || !z.string().uuid().safeParse(match[1]).success) {
          throw new Error("Invalid bundle name");
        }
        return summarizeFnnCodeBundle(await load(context, prefix, match[1], signal));
      }),
    );
    return { bundles, sampleLimit: FNN_CODE_LIST_LIMIT };
  } catch {
    throw new Error("تعذّر تحميل حزم code المحفوظة. أعد المحاولة.");
  }
}
