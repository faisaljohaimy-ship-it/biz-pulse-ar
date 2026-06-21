// Generates Saudi-Arabic VO segments for the final summary film (saudi-*).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/audio");
fs.mkdirSync(OUT, { recursive: true });

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("Missing ELEVENLABS_API_KEY"); process.exit(1); }
// Default: Haytham — native Saudi/Gulf male voice. Override with EL_VOICE_ID.
const VOICE = process.env.EL_VOICE_ID || "IES4nrmZdUBHByLBde0P";

// Saudi/Gulf-flavored conversational Arabic — warm, executive, confident.
const AR = [
  "أهلاً فيك… خلّني أختصر لك قصة نِكسيوس بأسلوب مباشر.",
  "اليوم، أي شركة كبيرة تعاني من شي واحد: قرارات بطيئة، وبيانات متفرقة في كل مكان.",
  "نِكسيوس يجمع لك كل شي في غرفة قيادة وحدة، ويعطيك القرار مدعوم بالأرقام في ثواني.",
  "تتكلم معه بالعربي… تسأله، يجاوبك، يحلل لك، ويعطيك توصية تنفيذية واضحة.",
  "نتيجة عملية: تخفيض اثنين وأربعين بالمئة في وقت اتخاذ القرار، وعائد يتجاوز أربعمئة وعشرين بالمئة في أول سنة.",
  "السر في ثلاث أشياء: تكامل ذكي مع أنظمتك، ووكلاء يشتغلون أربع وعشرين ساعة، وحوكمة كاملة تحمي كل ريال.",
  "نِكسيوس مو مجرد نظام… هو عقل رقمي يخدم القيادة التنفيذية ويصنع الميزة التنافسية القادمة.",
  "جاهز نبدأ معك… نِكسيوس… الذكاء التنفيذي بصيغة سعودية.",
];

const EN = [
  "Welcome — let me give you the short story of NEEXIOS.",
  "Every large enterprise struggles with one thing: slow decisions and scattered data.",
  "NEEXIOS unifies it into one command room and delivers evidence-backed decisions in seconds.",
  "You speak to it in Arabic — it answers, analyzes, and recommends a clear executive action.",
  "Result: 42% faster decisions and over 420% ROI in the first year.",
  "Three pillars: deep integration, 24/7 AI agents, and full governance protecting every riyal.",
  "NEEXIOS is not just a system — it's a digital brain for executive leadership.",
  "Ready when you are. NEEXIOS — executive intelligence, made in Saudi.",
];

const OPTS = {
  model_id: "eleven_multilingual_v2",
  voice_settings: { stability: 0.55, similarity_boost: 0.92, style: 0.45, use_speaker_boost: true, speed: 0.96 },
};

for (let i = 0; i < AR.length; i++) {
  const out = path.join(OUT, `saudi-${String(i).padStart(2, "0")}.mp3`);
  if (fs.existsSync(out) && fs.statSync(out).size > 3000 && !process.env.FORCE) { console.log("skip", out); continue; }
  process.stdout.write(`gen ${i}... `);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: AR[i],
      previous_text: AR[i-1] ?? "",
      next_text: AR[i+1] ?? "",
      ...OPTS,
    }),
  });
  if (!res.ok) { console.log("FAIL", res.status, await res.text()); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log(buf.length, "bytes");
}

const durations = AR.map((_, i) => {
  const f = path.join(OUT, `saudi-${String(i).padStart(2, "0")}.mp3`);
  const o = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${f}"`).toString().trim();
  return parseFloat(o);
});
fs.writeFileSync(path.join(OUT, "saudi-durations.json"), JSON.stringify(durations, null, 2));
fs.writeFileSync(path.join(OUT, "saudi-en.json"), JSON.stringify(EN, null, 2));
fs.writeFileSync(path.join(OUT, "saudi-ar.json"), JSON.stringify(AR, null, 2));
console.log("durations:", durations, "total:", durations.reduce((a,b)=>a+b,0).toFixed(1));
