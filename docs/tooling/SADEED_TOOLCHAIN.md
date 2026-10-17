# SADEED — طبقة الأدوات المعتمدة (toolchain)

أحدث إضافات/مهارات/مخدّمات MCP الخارجية المُودَعة في المستودع لتُطبَّق على المشروع
من الآن فصاعدًا، **محكومةً كلّها** بعقيدة `CLAUDE.md` ودستور
`SADEED_CONSTITUTION.md`. هذه أدوات **زمن التطوير** داخل Claude Code؛ ليست سطح
تشغيل إنتاجيّ، ولا تضيف اعتمادًا إنتاجيًّا جديدًا.

> المصدر: خمسة عروض مرجعية زوّدها المالك (٢٠٢٦/١٠/١٧). استُخرجت الأدوات من الإطارات
> والتعليقات، وتُسمّى هنا بمصادرها الرسمية لا بروابط العروض.

## 0. القواعد الحاكمة (تسبق كل أداة)

1. **الدستور يسود** عند أي تعارض: العربية أولًا/RTL، خطوط IBM Plex Sans Arabic /
   Tajawal / Cairo + لوحة navy/emerald، `regions.ts` مرجعًا جغرافيًّا وحيدًا، صوت
   سَدِيد الذكوري حصرًا ومنع `speechSynthesis`.
2. **لا سرّ في العميل أو المستودع.** كل مفتاح يُضبط في البيئة باسمه فقط
   (`.env.example` يسرد الأسماء، بلا قيم). أداة بلا مفتاح تبقى «مهيّأة غير مفعّلة».
3. **بوابة الجودة قبل أي دفع:** `nexios-standards` بداية الجلسة،
   `nexios-qa-guardian` يصرّح قبل أي commit يُدفع. لا تجاوز للبوابة بسبب أداة.
4. **فصل الطبقات:** هذه أدوات تطوير؛ لا تُستدعى من مسار الإنتاج (`src/**` المخدوم).
5. **موافقة MCP للمشروع:** عند أوّل جلسة يطلب Claude Code الثقة بمخدّمات `.mcp.json`
   — يوافق المالك مرّة. المفعّل تلقائيًّا هنا هو `playwright` وحده (بلا مفتاح، بلا خروج).

## 1. الجدول المعتمد

| #   | الأداة                     | المصدر                        | النوع     | التفعيل                                                            | مفاتيح/بيئة (أسماء)               | خروج شبكيّ            | حكم التوافق                                     |
| --- | -------------------------- | ----------------------------- | --------- | ------------------------------------------------------------------ | --------------------------------- | --------------------- | ----------------------------------------------- |
| 1   | Agent Skills               | `addyosmani/agent-skills`     | مهارات    | `npx skills add addyosmani/agent-skills`                           | —                                 | لا                    | ✅ يُدمَج، مكمّل لـ`tdd-workflow`               |
| 2   | Context7                   | `upstash/context7`            | MCP       | في `.mcp.json` (`context7`)                                        | `CONTEXT7_API_KEY` (اختياري)      | توثيق فقط             | ✅ يُدمَج                                       |
| 3   | Graphify                   | `Graphify-Labs/graphify`      | مهارة/CLI | `pip install graphifyy && graphify install`                        | — (تحليل محلّي)                   | وثائق فقط عبر النموذج | ✅ يُدمَج؛ مخرجاته لا تدخل git                  |
| 4   | 21st.dev Magic             | `@21st-dev/magic`             | MCP       | في `.mcp.json` (`magic`)                                           | `TWENTYFIRST_API_KEY`             | توليد مكوّن           | ✅ يُدمَج تحت هوية سَدِيد                       |
| 5   | Strix                      | `usestrix/strix`              | CLI/CI    | `pipx install strix-agent` + `security-scan-strix.yml` (بالطلب)    | `STRIX_LLM`, `STRIX_LLM_API_KEY`  | فحص أصل المالك        | ✅ دفاعيّ على أصل المالك فقط، بالطلب            |
| 6   | REA                        | `morluto/rea` (`rea-agents`)  | CLI/MCP   | `npm i -g rea-agents && rea setup`                                 | —                                 | محلّي                 | ✅ ضمن حقوق المالك                              |
| 7   | LLM Wiki                   | `nvk/llm-wiki`                | إضافة     | سوقه في الإعدادات؛ `claude plugin install wiki@llm-wiki`           | —                                 | محلّي                 | ✅ يبني فوق مصادر الحقيقة لا يستبدلها           |
| 8   | Taste + web-design skills  | `Leonxlnx/taste-skill` + حزم  | مهارات    | `npx skills add Leonxlnx/taste-skill`                              | —                                 | لا                    | ✅ هوية سَدِيد تتقدّم (نصّ الدستور)             |
| 9   | Figma MCP + Playwright MCP | Figma / `@playwright/mcp`     | MCP       | في `.mcp.json` (`figma`, `playwright`)                             | OAuth Figma؛ Playwright بلا مفتاح | تصميم/متصفّح          | ✅ يُدمَج                                       |
| 10  | Awesome Free LLM APIs      | `mnfst/awesome-free-llm-apis` | قائمة     | مرجع يُقرأ                                                         | —                                 | لا                    | ⚠️ مرجع فقط، لا يُوصَل بالتشغيل (حصرية المزوّد) |
| 11  | claude-mem                 | `thedotmack/claude-mem`       | إضافة     | سوقه في الإعدادات؛ `/plugin marketplace add thedotmack/claude-mem` | — (محلّي)                         | محلّي                 | ✅ يُفعَّله المطوّر؛ لا يحفظ أسرارًا            |
| 12  | Agent Reach                | `Panniantong/agent-reach`     | مهارة/CLI | `npx skills add Panniantong/Agent-Reach@agent-reach` (بإذن المالك) | اعتمادات محلّية 600               | ويب/منصّات واسع       | ⚠️ وراء بوابة المالك، لا تفعيل تلقائيّ          |

## 2. ما أُودِع في المستودع فعلًا

- `.mcp.json` — أربعة مخدّمات MCP: `context7`, `magic`, `playwright`, `figma`
  (المفاتيح `${ENV:-}` من البيئة، بلا قيم). REA وAgent Reach خارجها لأنّهما
  يتطلّبان تثبيتًا عامًّا أولًا (موثّقان في مهارتيهما).
- `.claude/settings.json` — تفعيل `playwright` تلقائيًّا فقط، وتسجيل سوقَي
  `llm-wiki` و`claude-mem`.
- `.claude/skills/sadeed-toolchain/` — الفهرس الحاكم، و`.claude/skills/toolchain-*/`
  — مهارة لكلّ أداة (متى تُستعمل، كيف تُفعَّل، مفاتيحها، وحوكمتها).
- `.github/workflows/security-scan-strix.yml` — فحص Strix الذاتيّ المأذون،
  `workflow_dispatch` فقط، غير حاجب، لا يعمل إلا بإضافة المالك للسرّين.
- `.env.example` — أسماء المتغيّرات الجديدة (بلا قيم).

## 3. ما على المالك فعله لتفعيل كلّ أداة

1. **المفاتيح على البيئة** (لا في git): `CONTEXT7_API_KEY` (اختياري)،
   `TWENTYFIRST_API_KEY` (لـMagic)، و—لـStrix في CI—سرّا المستودع
   `STRIX_LLM` و`STRIX_LLM_API_KEY` (Settings → Secrets → Actions).
2. **ثقة MCP:** وافق على مخدّمات المشروع عند أوّل جلسة (Context7/Magic/Figma).
   Figma يتطلّب تسجيل دخول OAuth وخطّة Dev Mode مناسبة.
3. **الإضافات المحلّية:** ثبّت `wiki@llm-wiki` و`claude-mem` بأمر كلٍّ عند الحاجة.
4. **CLIs عند اللزوم:** `graphifyy` (Python)، `rea-agents` (npm)، `strix-agent`
   (pipx + Docker)، و—بإذن—`agent-reach`.
5. **مرجع فقط:** «Awesome Free LLM APIs» يبقى وثيقة قرار؛ لا يُدمَج في مسار
   `/api/chat`؛ أي تغيير مزوّد إنتاجيّ يمرّ المادة ٢٩ وإذنك الصريح.
6. **Agent Reach:** لا تُفعّله إلا لمهمّة بحث عامّة محدّدة، بحسابات منفصلة، بعيدًا
   عن أسرار/حسابات الإنتاج.

## 4. حدود التحقّق

أسماء الحزم وأوامر التثبيت من مصادرها المعلنة وقت الكتابة (٢٠٢٦/١٠/١٧)؛ قد تتغيّر
الإصدارات، فتحقّق من المصدر الرسمي لكلّ أداة قبل الاعتماد في CI. لم يُنفَّذ أيّ أمر
تثبيت ولا فحص Strix في هذه الدفعة — الملفّات إعداد وتوثيق قابلان للمراجعة، تُفعِّلها
أنت حين تشاء.
