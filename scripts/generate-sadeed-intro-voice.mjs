/** One-time free-tier generation; never called by the application or page load.
 * Node >=22.18. Keep ELEVENLABS_API_KEY in the shell's secret environment.
 * Uses the exact voice/model/settings imported by the bot's TTS endpoints.
 */
import { writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SADEED_ELEVENLABS_VOICE_ID,
  SADEED_ELEVENLABS_MODEL,
  SADEED_ELEVENLABS_VOICE_SETTINGS,
} from "../src/lib/sadeed/voice-config.ts";

const text =
  "هَلَا بِكُمْ فِي سَدِيد، مَنْظُومَةِ الْقَرَارِ وَالْإِنْجَازِ الذَّكِيّ. فِي بِيئَةِ الْعَمَلِ الصِّنَاعِيِّ، كُلُّ مَعْلُومَةٍ لَهَا قِيمَة، وَكُلُّ قَرَارٍ لَهُ أَثَر. سَدِيد يَجْمَعُ الْعَمَلِيَّاتِ وَالْبَلَاغَاتِ وَالصِّيَانَةَ فِي مَكَانٍ وَاحِد، عَشَان تَكُونَ الصُّورَةُ أَوْضَح، وَالْمُتَابَعَةُ أَسْهَل. مِنْ تَصَارِيحِ الْعَمَلِ إِلَى الْمَخَاطِرِ وَالتَّقَارِير، تَوْصَلُ لِلْمَعْلُومَةِ بِحَسَبِ صَلَاحِيَّتِك. أَنَا سَدِيد، مُسَاعِدُك فِي فَهْمِ الْبَيَانَاتِ وَتَلْخِيصِهَا، بِالْعَرَبِيَّةِ وَفِي سِيَاقِ عَمَلِك. وَمَعَ وَكِيلِ الْأَتْمَتَةِ، تَتَجَهَّزُ خُطَطُ الْمُتَابَعَة، وَتَتَوَزَّعُ الْأَدْوَارُ بَيْنَ الْوُكَلَاءِ الْمُتَخَصِّصِينَ. الْأَتْمَتَةُ تَقْتَرِح، وَصَاحِبُ الصَّلَاحِيَّةِ يَعْتَمِد. كُلُّ خُطْوَةٍ بِوُضُوح، وَكُلُّ إِجْرَاءٍ ضِمْنَ حُدُودِهِ. سَدِيد، قَرَارٌ أَدَقّ، وَإِنْجَازٌ أَسْرَع. حَيَّاكُمْ، وَابْدَؤُوا رِحْلَتَكُمْ مَعَنَا.";
const out = process.argv[2];
if (!out) throw new Error("Pass an output MP3 path outside the repository.");
try {
  await access(out);
  throw new Error("Output exists: refusing duplicate generation.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is not configured; no generation requested.");
const headers = { "xi-api-key": key, "Content-Type": "application/json" };
const subscription = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
  headers,
  signal: AbortSignal.timeout(15000),
});
if (!subscription.ok)
  throw new Error(`Cannot verify free quota (${subscription.status}); stopped.`);
const quota = await subscription.json();
if (
  quota.tier !== "free" ||
  !Number.isFinite(quota.character_limit) ||
  !Number.isFinite(quota.character_count) ||
  quota.character_limit - quota.character_count < text.length ||
  quota.allowed_to_extend_character_limit === true
) {
  throw new Error("Free-only quota gate closed; no generation requested.");
}
const speech = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${SADEED_ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
  {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      text,
      model_id: SADEED_ELEVENLABS_MODEL,
      voice_settings: SADEED_ELEVENLABS_VOICE_SETTINGS,
    }),
  },
);
// No retries, fallback voice, quota extension, or paid plan upgrade.
if (!speech.ok || !speech.headers.get("content-type")?.startsWith("audio/")) {
  throw new Error(`Voice unavailable (${speech.status}); stopped without retry.`);
}
await writeFile(resolve(out), new Uint8Array(await speech.arrayBuffer()), {
  flag: "wx",
  mode: 0o600,
});
console.log("Narration saved. Check pronunciation and duration before rendering --audio.");
