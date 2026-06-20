// Arabic narration for NEEXIOS cinematic. George — deep authoritative Arabic.
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");

const VOICE = "onwK4e9ZLuTAKqWW03F9"; // Daniel — deep multilingual male, strong Arabic

const lines = [
  "مرحباً بكم في مستقبل الذكاء الاصطناعي المؤسسي.",
  "نِكسَس… نظام التشغيل الذكي للمؤسسات الوطنية.",
  "مركز قيادة تنفيذي… كل قرار استراتيجي… في سطح واحد.",
  "عمليات الحج… ملايين الحجاج… في الوقت الحقيقي.",
  "إدارة قوى عاملة ذكية… كل موظفٍ… في المكان الصحيح.",
  "ذكاءٌ تنبّؤي… وتوأمٌ رقمي يُحاكي مؤسستك بأكملها.",
  "وكلاء ذكاءٍ اصطناعي… يعملون… بلا توقّف.",
  "قبل الذكاء الاصطناعي… فوضى. بعد نِكسَس… انضباطٌ كامل.",
  "جاهزٌ للمؤسسات. جاهزٌ للحكومات. جاهزٌ للاستحواذ.",
  "نِكسَس إيه آي أو إس… منصّةُ الذكاء الاصطناعي المؤسسية القادمة.",
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
          stability: 0.7, similarity_boost: 0.88, style: 0.28,
          use_speaker_boost: true, speed: 0.92,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`tts ${i}: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.resolve(`public/audio/nx-${String(i).padStart(2, "0")}.mp3`);
  fs.writeFileSync(out, buf);
  console.log("wrote", out, buf.length);
}

for (let i = 0; i < lines.length; i++) {
  await tts(lines[i], i, lines[i - 1], lines[i + 1]);
}
console.log("DONE");
