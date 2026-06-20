import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY missing");
const VOICE = "onwK4e9ZLuTAKqWW03F9"; // Daniel - multilingual

const lines = [
  "مرحباً بك في جولة نِكسَس التنفيذية. خلال دقيقة واحدة، سنعرض كيف تستخدم النظام من البداية إلى القرار.",
  "الخطوة الأولى: تسجيل الدخول. اضغط زر الدخول الآمن، وأدخل بريدك المؤسسي، فيتحقق النظام من هويتك عبر المصادقة الثنائية.",
  "الخطوة الثانية: إضافة البيانات. افتح مركز التكامل، واربط أنظمتك مثل ساب ومايكروسوفت بضغطة واحدة، فتتدفق البيانات تلقائياً.",
  "الخطوة الثالثة: مراجعة المؤشرات. ادخل إلى لوحة القيادة التنفيذية، حيث تظهر جميع المؤشرات الحيّة في مكان واحد.",
  "الخطوة الرابعة: مساعد الذكاء الاصطناعي. اطرح سؤالك على آريا بلغتك الطبيعية، فتُجيبك فوراً بتحليل دقيق وتوصية واضحة.",
  "الخطوة الخامسة: إصدار التقارير. اضغط زر التقرير التنفيذي، فيُولِّد النظام تقريراً جاهزاً لمجلس الإدارة في ثوانٍ.",
  "الخطوة السادسة: المراقبة اللحظية. تابع العمليات والمخاطر حيّة على الشاشة، مع تنبيهات ذكية فور ظهور أي انحراف.",
  "الخطوة السابعة: اتخاذ القرار. راجع توصيات الذكاء الاصطناعي، واختر القرار الأنسب بضغطة واحدة، ليُنفَّذ تلقائياً عبر الأنظمة.",
  "هكذا تختصر نِكسَس رحلة القرار من ساعات إلى ثوانٍ. نظامٌ واحد… لكل ما تحتاجه المؤسسة.",
];

async function tts(text, i, prev, next) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text, model_id: "eleven_multilingual_v2",
      previous_text: prev ?? "", next_text: next ?? "",
      voice_settings: { stability: 0.7, similarity_boost: 0.88, style: 0.25, use_speaker_boost: true, speed: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`tts ${i}: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.resolve(`public/audio/wt-${String(i).padStart(2, "0")}.mp3`);
  fs.writeFileSync(out, buf);
  return out;
}

const durations = [];
for (let i = 0; i < lines.length; i++) {
  const f = await tts(lines[i], i, lines[i - 1], lines[i + 1]);
  const d = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${f}"`).toString().trim());
  durations.push(d);
  console.log(i, d.toFixed(2) + "s");
}
fs.writeFileSync("public/audio/wt-durations.json", JSON.stringify(durations, null, 2));
console.log("TOTAL", durations.reduce((a, b) => a + b, 0).toFixed(2) + "s");
