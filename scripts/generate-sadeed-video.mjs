#!/usr/bin/env node
/**
 * generate-sadeed-video.mjs — Executive Command Bridge · SADEED film assembly.
 *
 * Takes the SADEED narration audio (produced by generate-sadeed-audio.mjs) and
 * builds the "جسر القيادة التنفيذي" film in one of two modes:
 *
 *   1. HeyGen mode (default when HEYGEN_API_KEY is set): requests a talking
 *      SADEED avatar video per scene, driven by the pre-generated Layan audio,
 *      polls until ready, and downloads MP4s to public/media/bridge/video/.
 *
 *   2. Remotion fallback (when HeyGen is NOT configured): prints the exact
 *      command to render the self-contained Remotion composition in
 *      remotion/ — which composites the on-screen bridge scenes with the
 *      same Layan audio into bridge-final.mp4. No avatar service required.
 *
 * SECURITY: HEYGEN_API_KEY comes ONLY from the environment — never the repo.
 * The avatar/voice ids are also env-driven (account-specific), with clearly
 * labelled placeholders. No live call runs unless you set the key.
 *
 * Usage:
 *   HEYGEN_API_KEY=... node scripts/generate-sadeed-video.mjs            # HeyGen
 *   node scripts/generate-sadeed-video.mjs                              # prints Remotion fallback
 *   node scripts/generate-sadeed-video.mjs --lang ar
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUDIO_DIR = join(ROOT, "public", "media", "bridge", "audio");
const VIDEO_DIR = join(ROOT, "public", "media", "bridge", "video");

/* HeyGen avatar/voice are account-specific → environment, with placeholders.
 * SADEED's voice stays Layan: prefer driving the avatar with the pre-generated
 * ElevenLabs audio (audio-driven), not a HeyGen TTS voice. */
const HEYGEN_AVATAR_ID = process.env.HEYGEN_SADEED_AVATAR_ID?.trim() || "finn_executive_avatar";
const HEYGEN_BASE = "https://api.heygen.com";

/* SSRF guard: the render URL comes back from HeyGen's API — only ever fetch it
 * over https and from HeyGen's own hosts / their scoped object-store buckets,
 * never an arbitrary host a tampered response could point us at.
 *
 * amazonaws.com is a shared multi-tenant domain, so we DON'T allow it wholesale
 * (any AWS account could own a bucket there). We allow only HeyGen's known
 * bucket-name prefixes on S3; override via HEYGEN_ALLOWED_HOST_SUFFIXES (comma
 * list) if HeyGen serves from a different CDN in your account. */
const EXTRA_HOST_SUFFIXES = (process.env.HEYGEN_ALLOWED_HOST_SUFFIXES ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function hostAllowed(hostname) {
  const h = hostname.toLowerCase();
  if (/(^|\.)heygen\.com$/.test(h) || /(^|\.)heygen\.ai$/.test(h)) return true;
  // HeyGen's own S3 buckets are named "heygen…"; a random tenant bucket is not.
  if (/(^|\.)heygen[\w-]*\.s3[.-][\w-]+\.amazonaws\.com$/.test(h)) return true;
  if (/(^|\.)resource[\w-]*\.heygen\.(ai|com)$/.test(h)) return true;
  return EXTRA_HOST_SUFFIXES.some((suf) => h === suf || h.endsWith(`.${suf}`));
}

function assertHttps(rawUrl, label) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error(`${label} is not a valid URL`);
  }
  if (u.protocol !== "https:") throw new Error(`${label} must use https (got ${u.protocol})`);
  return u;
}

function assertAllowedDownload(rawUrl) {
  const u = assertHttps(rawUrl, "HeyGen download URL");
  if (!hostAllowed(u.hostname))
    throw new Error(
      `Refusing to download from an unexpected host: ${u.hostname}. ` +
        `If HeyGen serves your renders from a different host, set HEYGEN_ALLOWED_HOST_SUFFIXES.`,
    );
  return u;
}

/** Fetch with NO automatic redirect following: a 3xx to a private/internal
 * host would bypass the host allow-list (which only vetted the initial URL).
 * Every hop is re-validated against assertAllowedDownload before we follow. */
async function safeDownload(rawUrl, maxHops = 3) {
  let current = assertAllowedDownload(rawUrl).href;
  for (let hop = 0; hop <= maxHops; hop += 1) {
    const res = await fetch(current, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`Redirect with no Location from ${current}`);
      current = assertAllowedDownload(new URL(location, current).href).href;
      continue;
    }
    return res;
  }
  throw new Error(`Too many redirects while downloading (> ${maxHops})`);
}

function parseArgs(argv) {
  const args = { lang: "ar" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--lang") args.lang = argv[(i += 1)];
  }
  return args;
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(join(AUDIO_DIR, "manifest.json"), "utf8"));
  } catch (err) {
    // A missing manifest is the expected "audio not generated yet" case → null.
    // A present-but-unreadable/corrupt manifest is a real fault → surface it,
    // don't silently treat it as "not generated".
    if (err && err.code === "ENOENT") return null;
    throw new Error(`Audio manifest is unreadable or corrupt: ${err?.message ?? err}`);
  }
}

function printRemotionFallback(reason) {
  console.log(`\n▷ HeyGen not used (${reason}). Using the Remotion fallback.\n`);
  console.log("The self-contained composition lives in remotion/ (its own Bun project)");
  console.log("and composites the bridge scenes with the Layan narration into one film.\n");
  console.log("Render it (Remotion is a dep of the remotion/ sub-project, not the app):\n");
  console.log("    cd remotion && bun install");
  console.log("    ELEVENLABS_LANG=ar bunx remotion render index.tsx BridgeFilm \\");
  console.log("      ../public/media/bridge/bridge-final.mp4 \\");
  console.log("      --public-dir=../public --codec=h264\n");
  console.log("Prerequisite: run scripts/generate-sadeed-audio.mjs first so the audio");
  console.log("clips exist in public/media/bridge/audio/. See remotion/BRIDGE_FILM.md.\n");
}

async function heygenRequest(apiKey, audioUrlOrText, sceneId) {
  // Audio-driven talking-avatar clip (keeps SADEED's Layan voice).
  const res = await fetch(`${HEYGEN_BASE}/v2/video/generate`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: "avatar", avatar_id: HEYGEN_AVATAR_ID, avatar_style: "normal" },
          voice: { type: "audio", audio_url: audioUrlOrText },
          background: { type: "color", value: "#04101c" },
        },
      ],
      dimension: { width: 1920, height: 1080 },
      title: `sadeed-bridge-${sceneId}`,
    }),
  });
  if (!res.ok)
    throw new Error(`HeyGen generate ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const videoId = data?.data?.video_id ?? data?.video_id;
  if (!videoId) throw new Error(`HeyGen returned no video_id for scene ${sceneId}`);
  return videoId;
}

async function heygenPoll(apiKey, videoId) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const res = await fetch(`${HEYGEN_BASE}/v1/video_status.get?video_id=${videoId}`, {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) throw new Error(`HeyGen status ${res.status}`);
    const data = (await res.json())?.data ?? {};
    if (data.status === "completed") return data.video_url;
    if (data.status === "failed")
      throw new Error(`HeyGen render failed: ${data.error ?? "unknown"}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("HeyGen render timed out");
}

async function main() {
  const { lang } = parseArgs(process.argv);
  const apiKey = process.env.HEYGEN_API_KEY?.trim();

  if (!apiKey) {
    printRemotionFallback("HEYGEN_API_KEY not set");
    process.exit(0);
  }

  const manifest = await loadManifest();
  if (!manifest || manifest.files.length === 0) {
    console.error("✗ No audio manifest found. Run scripts/generate-sadeed-audio.mjs first.");
    process.exit(1);
  }

  await mkdir(VIDEO_DIR, { recursive: true });
  const clips = manifest.files.filter((f) => f.lang === lang);
  if (clips.length === 0) {
    console.error(`✗ No ${lang} audio clips in the manifest. Generate them first.`);
    process.exit(1);
  }

  console.log(
    "Note: HeyGen must be able to fetch each audio clip by URL. Host public/media/bridge/audio/",
  );
  console.log("on your deploy (or a signed URL) and set BRIDGE_AUDIO_BASE_URL.\n");
  const audioBase = process.env.BRIDGE_AUDIO_BASE_URL?.trim();
  if (!audioBase) {
    console.error("✗ Set BRIDGE_AUDIO_BASE_URL to the public base URL of the audio clips.");
    process.exit(1);
  }
  // HeyGen must fetch each clip over https; a plain-http base can't be reached
  // by the service and would also be an insecure origin to hand it.
  assertHttps(audioBase, "BRIDGE_AUDIO_BASE_URL");

  const rendered = [];
  for (const clip of clips) {
    process.stdout.write(`→ HeyGen · ${clip.scene} … `);
    const videoId = await heygenRequest(apiKey, `${audioBase}/${clip.file}`, clip.scene);
    const url = await heygenPoll(apiKey, videoId);
    const res = await safeDownload(url);
    if (!res.ok) throw new Error(`Download failed ${res.status} for scene ${clip.scene}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!/^(video\/|application\/octet-stream)/i.test(contentType))
      throw new Error(`Unexpected content-type "${contentType}" for scene ${clip.scene}`);
    const bin = Buffer.from(await res.arrayBuffer());
    // A valid MP4 is never a few bytes — reject a truncated/empty body instead
    // of writing a corrupt file and reporting "ok".
    if (bin.byteLength < 1024)
      throw new Error(
        `Downloaded clip for scene ${clip.scene} is only ${bin.byteLength} bytes — not a valid MP4`,
      );
    const file = `${clip.file.replace(/\.mp3$/, "")}.mp4`;
    await writeFile(join(VIDEO_DIR, file), bin);
    rendered.push({ scene: clip.scene, file });
    console.log("ok");
  }

  await writeFile(
    join(VIDEO_DIR, "manifest.json"),
    `${JSON.stringify({ mode: "heygen", avatar: HEYGEN_AVATAR_ID, clips: rendered }, null, 2)}\n`,
  );
  console.log(`\n✓ ${rendered.length} scene video(s) in public/media/bridge/video/`);
  console.log("  Stitch them into bridge-final.mp4 with your editor, or use the Remotion");
  console.log("  composition to sequence scenes automatically.");
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
