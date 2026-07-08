// Generates Arabic VO for the Executive Product Demonstration video.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/audio");
fs.mkdirSync(OUT, { recursive: true });

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("Missing ELEVENLABS_API_KEY");
  process.exit(1);
}
const VOICE = process.env.EL_VOICE_ID || "IES4nrmZdUBHByLBde0P"; // Arabic male executive

const LINES = [
  // 0 intro
  "نيكسيوس. نظام التشغيل الذكي للمؤسسات. عرض تنفيذي مباشر داخل المنصة.",
  // 1 login
  "يبدأ المستخدم بتسجيل دخول آمن موحد. هوية واحدة. صلاحيات مدققة. وصول لحظي.",
  // 2 cockpit
  "قمرة القيادة التنفيذية. مؤشرات صحة المؤسسة، التنبيهات الحرجة، والمهام المفتوحة، في شاشة واحدة.",
  // 3 intelligence
  "محرك الذكاء يجمع الإشارات من كل النظم، يحلل الأنماط، ويولد رؤى استراتيجية فورية.",
  // 4 decisions
  "مركز القرارات. توصيات مدعومة بالذكاء الاصطناعي، مع درجة ثقة، وأثر مالي، ومالك تنفيذي لكل قرار.",
  // 5 risk
  "مركز المخاطر يرصد المخاطر التشغيلية والمالية والامتثالية، ويصنفها حسب الأثر والاحتمالية.",
  // 6 integrations
  "مركز قيادة التكاملات. ربط حي مع SAP و Microsoft 365 و Outlook و Teams و SharePoint و Azure AD و Snowflake و Oracle و Salesforce و ServiceNow.",
  // 7 architecture
  "تدفق البيانات يصل من مصادر المؤسسة إلى نواة نيكسيوس، حيث يُحلَّل ويُحوَّل إلى قرارات وتقارير وأتمتة.",
  // 8 agents
  "وكلاء ذاتيون مستقلون. وكيل المالية، ووكيل المخاطر، ووكيل المبيعات، وكلهم يعملون على مدار الساعة.",
  // 9 governance
  "حوكمة كاملة. سياسات، ومراجعة، وضوابط أمن سيبراني، مع توافق ISO و SOC و NCA.",
  // 10 analytics
  "تحليلات تنفيذية. تقارير لحظية، ومؤشرات أداء، ومقارنات تاريخية، جاهزة للعرض على مجلس الإدارة.",
  // 11 briefing
  "الموجز التنفيذي. تقرير ذكي يولَّد تلقائياً، جاهز للمدير التنفيذي والمستثمر والجهة الحكومية.",
  // 12 outro
  "نيكسيوس. جاهز للتشغيل المؤسسي. neexios.com.",
];

const OPTS = {
  model_id: "eleven_multilingual_v2",
  voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
};

for (let i = 0; i < LINES.length; i++) {
  const out = path.join(OUT, `dx-${String(i).padStart(2, "0")}.mp3`);
  if (fs.existsSync(out) && fs.statSync(out).size > 3000) {
    console.log("skip", out);
    continue;
  }
  process.stdout.write(`gen ${i}... `);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: LINES[i], ...OPTS }),
  });
  if (!res.ok) {
    console.log("FAIL", res.status, await res.text());
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log(buf.length, "bytes");
}

// Probe durations
const { execSync } = await import("child_process");
const durations = LINES.map((_, i) => {
  const f = path.join(OUT, `dx-${String(i).padStart(2, "0")}.mp3`);
  const o = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${f}"`)
    .toString()
    .trim();
  return parseFloat(o);
});
fs.writeFileSync(path.join(OUT, "dx-durations.json"), JSON.stringify(durations, null, 2));
console.log("durations:", durations);
console.log("total:", durations.reduce((a, b) => a + b, 0).toFixed(1), "s");
