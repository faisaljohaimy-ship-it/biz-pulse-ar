// Generate English documentary narration via ElevenLabs and concat to one MP3.
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");

// George — deep, authoritative English narrator
const VOICE = "JBFqnCBsd6RMkjVDRZzb";

const lines = [
  "In every enterprise, a thousand systems, a million signals, and no one connecting them.",
  "We present Nexus, the first AI operating system built for the enterprise.",
  "An executive cockpit, where every strategic metric lives on a single surface.",
  "The Intelligence Fabric, surfacing the threads that no human can see.",
  "The Digital Twin, your entire organization, in the palm of your hand.",
  "ARIA, your executive copilot, fluent in Arabic and English.",
  "Executive memory, no decision forgotten, no action lost.",
  "Predictive intelligence, exposing risk before it spreads.",
  "Governance you can measure, transformation you can prove, outcomes aligned to objectives.",
  "The boardroom, where the briefing is ready before the meeting begins.",
  "Voice in, voice out, hands free, mind clear.",
  "Enterprise-grade security, full transparency, sovereign control of your data.",
  "Nexus. The enterprise that never sleeps.",
];

async function tts(text, i, prev, next) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        previous_text: prev ?? "",
        next_text: next ?? "",
        voice_settings: {
          stability: 0.62,
          similarity_boost: 0.85,
          style: 0.32,
          use_speaker_boost: true,
          speed: 0.97,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`tts ${i}: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.resolve(`public/audio/en-line-${String(i).padStart(2, "0")}.mp3`);
  fs.writeFileSync(out, buf);
  console.log("wrote", out, buf.length);
}

for (let i = 0; i < lines.length; i++) {
  await tts(lines[i], i, lines[i - 1], lines[i + 1]);
}
console.log("DONE");
