// Generates Arabic VO segments for the ROI cinematic film (roi-*).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/audio");
fs.mkdirSync(OUT, { recursive: true });

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("Missing ELEVENLABS_API_KEY");
  process.exit(1);
}
// Daniel — deep authoritative multilingual male (strong Arabic)
const VOICE = process.env.EL_VOICE_ID || "onwK4e9ZLuTAKqWW03F9";

const AR = [
  "كل دقيقة تأخير في القرار التنفيذي تُكلِّف المؤسسات ملايين الريالات.",
  "نِكسيوس يُحوِّل البيانات الخام إلى قرارٍ مدعومٍ بالأدلة، في ثوانٍ معدودة.",
  "تخفيضٌ بنسبة اثنين وأربعين بالمئة في زمن اتخاذ القرار التنفيذي.",
  "خفضٌ بنسبة ثمانية وثلاثين بالمئة في التكاليف التشغيلية المُهدَرة سنوياً.",
  "ارتفاعٌ بنسبة واحدٍ وستين بالمئة في إنتاجية الفرق التنفيذية.",
  "عائدٌ على الاستثمار يتجاوز أربعمئةٍ وعشرين بالمئة خلال أول اثني عشر شهراً.",
  "استرداد كامل لكلفة التطبيق في أقل من خمسة أشهر تشغيلية.",
  "تكامل أصيل مع ساب، ومايكروسوفت، وأوراكل، يحمي استثماراتك القائمة ويضاعف قيمتها.",
  "حوكمةٌ، وامتثالٌ، وسجل تدقيق كامل. كل ريال يُنفَق… يُرى، ويُقاس، ويُبرَّر.",
  "نِكسيوس… ليس مصروفاً تقنياً. بل أصلٌ استراتيجي يصنع الميزة التنافسية القادمة.",
];

const EN = [
  "Every minute of executive decision delay costs enterprises millions.",
  "NEEXIOS turns raw data into evidence-backed decisions in seconds.",
  "42% reduction in executive decision time.",
  "38% cut in wasted annual operating cost.",
  "61% lift in executive team productivity.",
  "ROI exceeding 420% within the first 12 months.",
  "Full payback of deployment cost in under 5 operating months.",
  "Native integration with SAP, Microsoft, and Oracle — protecting and multiplying existing investments.",
  "Governance, compliance, and a complete audit trail. Every riyal spent is seen, measured, and justified.",
  "NEEXIOS is not an IT expense. It is a strategic asset that builds the next competitive edge.",
];

const OPTS = {
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.62,
    similarity_boost: 0.9,
    style: 0.32,
    use_speaker_boost: true,
    speed: 0.94,
  },
};

for (let i = 0; i < AR.length; i++) {
  const out = path.join(OUT, `roi-${String(i).padStart(2, "0")}.mp3`);
  if (fs.existsSync(out) && fs.statSync(out).size > 3000) {
    console.log("skip", out);
    continue;
  }
  process.stdout.write(`gen ${i}... `);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({
        text: AR[i],
        previous_text: AR[i - 1] ?? "",
        next_text: AR[i + 1] ?? "",
        ...OPTS,
      }),
    },
  );
  if (!res.ok) {
    console.log("FAIL", res.status, await res.text());
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(out, buf);
  console.log(buf.length, "bytes");
}

const durations = AR.map((_, i) => {
  const f = path.join(OUT, `roi-${String(i).padStart(2, "0")}.mp3`);
  const o = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${f}"`)
    .toString()
    .trim();
  return parseFloat(o);
});
fs.writeFileSync(path.join(OUT, "roi-durations.json"), JSON.stringify(durations, null, 2));
fs.writeFileSync(path.join(OUT, "roi-en.json"), JSON.stringify(EN, null, 2));
console.log("durations:", durations, "total:", durations.reduce((a, b) => a + b, 0).toFixed(1));
