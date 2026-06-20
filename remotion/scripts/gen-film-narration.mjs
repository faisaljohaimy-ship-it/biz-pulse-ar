// Generates Arabic VO segments for the Enterprise Executive Film (ef-*).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/audio");
fs.mkdirSync(OUT, { recursive: true });

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("Missing ELEVENLABS_API_KEY"); process.exit(1); }
const VOICE = process.env.EL_VOICE_ID || "IES4nrmZdUBHByLBde0P";

const LINES = [
  // 00 — cold open
  "في عالمٍ تُدار فيه المؤسسات بسرعة البيانات. القرار التالي يصنع المستقبل.",
  // 01 — command center
  "غرفُ القيادة الكبرى. بنوكٌ، حكومات، طاقة، مطارات. آلاف الإشارات في كل ثانية، وقرارٌ واحد لا يحتمل الخطأ.",
  // 02 — product transition
  "نِكسيوس. نظام التشغيل الذكي للمؤسسات. ليس فكرة، ليس عرضاً تقديمياً، بل منصة جاهزة للتشغيل.",
  // 03 — humans
  "الرئيس التنفيذي يرى مؤسسته بالكامل في شاشة واحدة. مدير المعلومات يراقب الأداء لحظياً. مسؤول الأمن السيبراني يتلقى التنبيهات قبل وقوع الحدث.",
  // 04 — AI in action
  "محرك الذكاء يجمع البيانات، يكشف الأنماط، يقيس المخاطر، ويولّد التوصية المدعومة بالأدلة. من البيانات إلى القرار في ثوانٍ.",
  // 05 — integrations
  "تكاملٌ أصيل مع ساب، ومايكروسوفت، وأوراكل، وسيلز فورس، وسيرفس ناو، ومستودعات البيانات. تدفقٌ آمن، حوكمةٌ كاملة، وسجلُ تدقيقٍ لكل حركة.",
  // 06 — impact
  "خفضٌ ملموس في التكاليف. تسريعٌ في القرار. ارتفاعٌ في الإنتاجية. حوكمةٌ تنفيذية شاملة. وامتثالٌ مستمر للمعايير الدولية والوطنية.",
  // 07 — boardroom
  "في قاعة مجلس الإدارة، تتحول الأرقام إلى استراتيجية، والاستراتيجية إلى تنفيذ، والتنفيذ إلى أثرٍ يُقاس.",
  // 08 — close
  "نِكسيوس. جاهزٌ للحكومات. جاهزٌ للبنوك. جاهزٌ للمؤسسات. جاهزٌ للاستحواذ. نظام تشغيل المؤسسة القادمة.",
];

const OPTS = {
  model_id: "eleven_multilingual_v2",
  voice_settings: { stability: 0.6, similarity_boost: 0.88, style: 0.4, use_speaker_boost: true },
};

for (let i = 0; i < LINES.length; i++) {
  const out = path.join(OUT, `ef-${String(i).padStart(2, "0")}.mp3`);
  if (fs.existsSync(out) && fs.statSync(out).size > 3000) { console.log("skip", out); continue; }
  process.stdout.write(`gen ${i}... `);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: LINES[i], ...OPTS }),
  });
  if (!res.ok) { console.log("FAIL", res.status, await res.text()); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log(buf.length, "bytes");
}

const durations = LINES.map((_, i) => {
  const f = path.join(OUT, `ef-${String(i).padStart(2, "0")}.mp3`);
  const o = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${f}"`).toString().trim();
  return parseFloat(o);
});
fs.writeFileSync(path.join(OUT, "ef-durations.json"), JSON.stringify(durations, null, 2));
// English subtitles
const EN = [
  "In a world where enterprises run at the speed of data — the next decision shapes the future.",
  "Command centers. Banks. Governments. Energy. Airports. Thousands of signals every second. One decision that cannot fail.",
  "NEEXIOS. The Enterprise AI Operating System. Not an idea, not a deck — a platform ready to deploy.",
  "The CEO sees the entire enterprise on one screen. The CIO monitors performance live. The CISO is alerted before the incident.",
  "The intelligence engine ingests data, detects patterns, scores risk, and produces evidence-backed recommendations. Data to decision in seconds.",
  "Native integration with SAP, Microsoft, Oracle, Salesforce, ServiceNow and data warehouses. Secure flow, full governance, audit trail on every action.",
  "Measurable cost reduction. Faster decisions. Higher productivity. End-to-end executive governance. Continuous compliance with international and national standards.",
  "In the boardroom, numbers become strategy, strategy becomes execution, and execution becomes measurable impact.",
  "NEEXIOS. Ready for governments. Ready for banks. Ready for enterprise. Ready for acquisition. The operating system of the next-generation enterprise.",
];
fs.writeFileSync(path.join(OUT, "ef-en.json"), JSON.stringify(EN, null, 2));
console.log("durations:", durations, "total:", durations.reduce((a,b)=>a+b,0).toFixed(1));
