// generate Arabic documentary narration via ElevenLabs and concat into one MP3.
// scenes total ≈ 58s when spoken naturally; we render at speed 0.95.
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");

// Daniel — multilingual deep male, strong Arabic
const VOICE = "onwK4e9ZLuTAKqWW03F9";

// Approx 4s per line so durations align with scenes; total ~52s of speech.
const lines = [
  "في كل مؤسسة… ألفُ نظام، ومليونُ إشارة، ولا أحد يربط بينها.",
  "نُقدّم لكم نِكسَس… أوّل نظام تشغيلٍ ذكيٍّ للمؤسسات.",
  "قمرة قيادة تنفيذية… كل مؤشّر استراتيجي حيٌّ في سطح واحد.",
  "نسيج الذكاء… يكتشف الخيوط التي لا يراها بشر.",
  "التوأم الرقمي… مؤسستك كلها… بين يديك.",
  "آريا، مساعدك التنفيذي، تتقن العربية والإنجليزية.",
  "الذاكرة التنفيذية… لا قرارَ يُنسى، ولا إجراءَ يضيع.",
  "ذكاءٌ تنبّؤي… يكشف المخاطر قبل أن تنتشر.",
  "حوكمةٌ ملموسة، وتحوّلٌ مقاس، ونتائج تُقارن بالأهداف.",
  "مجلس الإدارة… يجد التقرير جاهزاً قبل أن يبدأ الاجتماع.",
  "صوتٌ يدخل، وصوتٌ يخرج… بلا يدين، وبعقلٍ صافٍ.",
  "أمنٌ على مستوى الصفّ، وشفافيةٌ كاملة، وسيادةٌ على البيانات.",
  "نِكسَس… المؤسسة التي… لا تنام.",
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
          stability: 0.68,
          similarity_boost: 0.88,
          style: 0.25,
          use_speaker_boost: true,
          speed: 0.95,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`tts ${i}: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.resolve(`public/audio/line-${String(i).padStart(2, "0")}.mp3`);
  fs.writeFileSync(out, buf);
  console.log("wrote", out, buf.length);
}

for (let i = 0; i < lines.length; i++) {
  await tts(lines[i], i, lines[i - 1], lines[i + 1]);
}
console.log("DONE");
