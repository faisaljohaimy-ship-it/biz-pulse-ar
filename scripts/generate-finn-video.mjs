#!/usr/bin/env node
/**
 * generate-finn-video.mjs — Executive Command Bridge · FINN film assembly.
 *
 * Takes the FINN narration audio (produced by generate-finn-audio.mjs) and
 * builds the "جسر القيادة التنفيذي" film in one of two modes:
 *
 *   1. HeyGen mode (default when HEYGEN_API_KEY is set): requests a talking
 *      FINN avatar video per scene, driven by the pre-generated Layan audio,
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
 *   HEYGEN_API_KEY=... node scripts/generate-finn-video.mjs            # HeyGen
 *   node scripts/generate-finn-video.mjs                              # prints Remotion fallback
 *   node scripts/generate-finn-video.mjs --lang ar
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUDIO_DIR = join(ROOT, "public", "media", "bridge", "audio");
const VIDEO_DIR = join(ROOT, "public", "media", "bridge", "video");

/* HeyGen avatar/voice are account-specific → environment, with placeholders.
 * FINN's voice stays Layan: prefer driving the avatar with the pre-generated
 * ElevenLabs audio (audio-driven), not a HeyGen TTS voice. */
const HEYGEN_AVATAR_ID = process.env.HEYGEN_FINN_AVATAR_ID?.trim() || "finn_executive_avatar";
const HEYGEN_BASE = "https://api.heygen.com";

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
  } catch {
    return null;
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
  console.log("Prerequisite: run scripts/generate-finn-audio.mjs first so the audio");
  console.log("clips exist in public/media/bridge/audio/. See remotion/BRIDGE_FILM.md.\n");
}

async function heygenRequest(apiKey, audioUrlOrText, sceneId) {
  // Audio-driven talking-avatar clip (keeps FINN's Layan voice).
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
      title: `finn-bridge-${sceneId}`,
    }),
  });
  if (!res.ok)
    throw new Error(`HeyGen generate ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.data?.video_id ?? data?.video_id;
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
    console.error("✗ No audio manifest found. Run scripts/generate-finn-audio.mjs first.");
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

  const rendered = [];
  for (const clip of clips) {
    process.stdout.write(`→ HeyGen · ${clip.scene} … `);
    const videoId = await heygenRequest(apiKey, `${audioBase}/${clip.file}`, clip.scene);
    const url = await heygenPoll(apiKey, videoId);
    const bin = Buffer.from(await (await fetch(url)).arrayBuffer());
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
