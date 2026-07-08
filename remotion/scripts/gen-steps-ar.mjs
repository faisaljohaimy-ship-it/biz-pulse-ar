import fs from "node:fs";
import path from "node:path";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");
const VOICE = "onwK4e9ZLuTAKqWW03F9"; // Daniel

const lines = [
  "في عصر التحوّل الرقمي… كل مؤسسة تواجه فوضى الأنظمة، وكثرة البيانات، وضعف القرار.",
  "الخطوة الأولى: نِكسَس يربط كل أنظمتك، ويُحوّل البيانات إلى إشارات حيّة مدعومة بالذكاء الاصطناعي.",
  "الخطوة الثانية: نسيج الذكاء يُحلّل ملايين الإشارات لحظياً، ويكشف الأنماط الخفيّة وراء المشكلات.",
  "الخطوة الثالثة: التوأم الرقمي يُحاكي مؤسستك بالكامل، ويتيح اختبار القرارات قبل اتخاذها.",
  "الخطوة الرابعة: آريا، مساعدك التنفيذي بالذكاء الاصطناعي، تفهم سؤالك، وتُجيب فوراً، بالعربية والإنجليزية.",
  "الخطوة الخامسة: الذكاء التنبّؤي يكشف المخاطر قبل وقوعها، ويقترح الحلول قبل تفاقم المشكلة.",
  "الخطوة السادسة: الحوكمة الذكية تربط كل سياسة بنتيجة قابلة للقياس، وكل برنامج تحوّل بأهدافه.",
  "الخطوة السابعة: مجلس الإدارة يجد التقرير التنفيذي جاهزاً، مُولَّداً بالذكاء الاصطناعي قبل بدء الاجتماع.",
  "الخطوة الثامنة: الذاكرة التنفيذية تحفظ كل قرار، وكل إجراء، وتُعيد استدعاء السياق متى احتجت إليه.",
  "نِكسَس… نظامٌ رقميٌّ شاملٌ متكامل… يحلّ مشكلات المؤسسات بالذكاء الاصطناعي… في كل خطوة.",
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
          style: 0.28,
          use_speaker_boost: true,
          speed: 0.95,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`tts ${i}: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.resolve(`public/audio/step-ar-${String(i).padStart(2, "0")}.mp3`);
  fs.writeFileSync(out, buf);
  console.log("wrote", out, buf.length);
}

for (let i = 0; i < lines.length; i++) await tts(lines[i], i, lines[i - 1], lines[i + 1]);
console.log("DONE");
