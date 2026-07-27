#!/usr/bin/env node
/**
 * generate-finn-audio.mjs — Executive Command Bridge · FINN narration → MP3.
 *
 * Reads the seven-scene bilingual narration (scripts/bridge-narration.ar.md
 * and .en.md) and synthesizes one MP3 per scene per language with the FINN
 * voice — ElevenLabs "Layan" EXCLUSIVELY. There is no browser TTS and no
 * fallback voice: FINN's identity is never substituted.
 *
 * SECURITY: the API key comes ONLY from the ELEVENLABS_API_KEY environment
 * variable. No key is ever read from, or written to, the repository. The
 * voice id / model / settings mirror src/lib/aria/voice-config.ts (the voice
 * id is a public ElevenLabs identifier, not a secret).
 *
 * Output: public/media/bridge/audio/<scene>.<lang>.mp3 + a manifest.json.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... node scripts/generate-finn-audio.mjs            # both languages
 *   ELEVENLABS_API_KEY=... node scripts/generate-finn-audio.mjs --lang ar
 *   ELEVENLABS_API_KEY=... node scripts/generate-finn-audio.mjs --scene command-pulse
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "media", "bridge", "audio");

/* ── Voice identity — mirrors src/lib/aria/voice-config.ts ─────────────────
 * FINN = ElevenLabs "Layan", multilingual v2, executive-narration settings.
 * Max-quality delivery for a board-room film: steady stability, high
 * similarity, deliberate style. */
const VOICE_ID = "izhopdR43PRI5gAmjXTj"; // FINN_ELEVENLABS_VOICE_ID (public id)
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_192"; // highest MP3 tier for production audio
const VOICE_SETTINGS = {
  stability: 0.62,
  similarity_boost: 0.85,
  style: 0.12,
  use_speaker_boost: true,
};

const SCENES_ORDER = [
  "command-pulse",
  "decision-engine",
  "regional-grid",
  "aria-council",
  "digital-twin",
  "sovereign-trust",
  "activation",
];

function parseArgs(argv) {
  const args = { lang: "both", scene: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--lang") args.lang = argv[(i += 1)];
    else if (argv[i] === "--scene") args.scene = argv[(i += 1)];
  }
  return args;
}

/** Parse a narration markdown file into { sceneId: text } by the
 *  `<!-- scene: id -->` markers (identical in both languages). */
async function parseNarration(lang) {
  const path = join(__dirname, `bridge-narration.${lang}.md`);
  const md = await readFile(path, "utf8");
  const blocks = md.split(/<!--\s*scene:\s*([\w-]+)\s*-->/);
  const out = {};
  // blocks = [pre, id1, body1, id2, body2, ...]
  for (let i = 1; i < blocks.length; i += 2) {
    const id = blocks[i].trim();
    const body = blocks[i + 1] ?? "";
    // Drop the `## heading` line; keep the narration paragraph only.
    const text = body
      .replace(/^\s*##[^\n]*\n/, "")
      .replace(/\r/g, "")
      .trim();
    if (text) out[id] = text;
  }
  return out;
}

async function synthesize(apiKey, text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: VOICE_SETTINGS,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch((e) => {
      console.warn(`  ⚠ could not read ElevenLabs error body: ${e?.message ?? e}`);
      return "";
    });
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "✗ ELEVENLABS_API_KEY is not set. Export it first (never commit a key):\n" +
        "    export ELEVENLABS_API_KEY=your_key_here",
    );
    process.exit(1);
  }

  const { lang, scene } = parseArgs(process.argv);
  const langs = lang === "both" ? ["ar", "en"] : [lang];
  await mkdir(OUT_DIR, { recursive: true });

  const manifest = { voiceId: VOICE_ID, model: MODEL_ID, format: OUTPUT_FORMAT, files: [] };
  for (const lg of langs) {
    const narration = await parseNarration(lg);
    const requested = scene ? [scene] : SCENES_ORDER;
    const ids = requested.filter((id) => narration[id]);
    const missing = requested.filter((id) => !narration[id]);
    if (missing.length > 0)
      console.warn(`⚠ ${lg}: no narration found for scene(s): ${missing.join(", ")}`);
    for (const id of ids) {
      const idx = SCENES_ORDER.indexOf(id) + 1;
      const file = `${String(idx).padStart(2, "0")}-${id}.${lg}.mp3`;
      process.stdout.write(`→ ${lg} · ${id} … `);
      const audio = await synthesize(apiKey, narration[id]);
      await writeFile(join(OUT_DIR, file), audio);
      manifest.files.push({ scene: id, lang: lg, file, bytes: audio.length });
      console.log(`ok (${(audio.length / 1024).toFixed(0)} KB)`);
    }
  }

  // Nothing resolved (bad --scene, empty/renamed narration) must be a hard
  // error — not a silent success that leaves a stale/empty manifest behind.
  if (manifest.files.length === 0) {
    console.error(
      "✗ No audio was generated — check --scene / --lang and that the narration files contain the expected scene markers.",
    );
    process.exit(1);
  }

  await writeFile(join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n✓ ${manifest.files.length} clip(s) written to public/media/bridge/audio/`);
  console.log("  Next: node scripts/generate-finn-video.mjs");
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
