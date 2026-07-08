// Generate cinematic ambient bed via ElevenLabs Music. ~155s.
import fs from "node:fs";
import path from "node:path";
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");

const prompt =
  "Cinematic corporate keynote score, deep sub-bass pulse, soaring orchestral strings, warm synth pad, Middle Eastern percussion elements (subtle frame drum and oud accents), uplifting, epic, Apple keynote meets Vision 2030, no vocals, slow build to triumphant climax in final 30 seconds";

const res = await fetch("https://api.elevenlabs.io/v1/music", {
  method: "POST",
  headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, music_length_ms: 155000 }),
});
if (!res.ok) throw new Error(`music ${res.status} ${await res.text()}`);
const buf = Buffer.from(await res.arrayBuffer());
const out = path.resolve("public/audio/nx-music.mp3");
fs.writeFileSync(out, buf);
console.log("wrote", out, buf.length);
