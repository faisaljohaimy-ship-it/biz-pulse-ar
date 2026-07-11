// Auto-split from scenarios.ts — pure data.
import type { DecisionScenario } from "./scenarios.types";

export const SCENARIOS_B: Record<string, DecisionScenario> = {
  // ────────────────────────────────────────────────────────────────────────
  "executive-briefings": {
    kind: "decision_scenario",
    initialKpis: [
      { key: "clarity", label: { ar: "وضوح القرار", en: "Decision Clarity" }, value: 65 },
      { key: "speed", label: { ar: "سرعة الإحاطة", en: "Briefing Speed" }, value: 55 },
      { key: "trust", label: { ar: "ثقة المجلس", en: "Board Trust" }, value: 78 },
    ],
    steps: [
      {
        headline: {
          ar: "إحاطة تنفيذية قبل اجتماع المجلس بعد ساعة",
          en: "Executive briefing 1 hour before board meeting",
        },
        briefing: {
          ar: "المجلس سيسأل عن حادث الأمس. لديك 6 مصادر بيانات، 3 روايات متضاربة، و60 دقيقة. ARIA اقترحت ثلاث طرق للإحاطة.",
          en: "Board will ask about yesterday's incident. You have 6 data sources, 3 conflicting narratives, and 60 minutes. ARIA proposes three briefing paths.",
        },
        metrics: [
          { label: { ar: "مصادر البيانات", en: "Data sources" }, value: "6", tone: "warn" },
          {
            label: { ar: "روايات متضاربة", en: "Conflicting narratives" },
            value: "3",
            tone: "bad",
          },
          { label: { ar: "زمن التحضير", en: "Prep time" }, value: "60 min", tone: "warn" },
        ],
        options: [
          {
            label: {
              ar: "قراءة كل التقارير الست والدمج يدوياً",
              en: "Read all 6 reports and merge manually",
            },
            correct: false,
            feedback: {
              ar: "ستستنفد الساعة كاملة، وستقدّم إحاطة نصف مطبوخة. هذا هو بالضبط ما بُنيت ARIA لإلغائه.",
              en: "You'll burn the full hour and still present half-baked. This is exactly what ARIA was built to remove.",
            },
            kpiChanges: [
              { key: "speed", label: { ar: "سرعة", en: "Speed" }, delta: -18 },
              { key: "clarity", label: { ar: "وضوح", en: "Clarity" }, delta: -6 },
            ],
          },
          {
            label: {
              ar: "طلب إحاطة موحّدة من ARIA مع الاستشهادات + مراجعتها 15 دقيقة",
              en: "Ask ARIA for a unified brief with citations + 15 min review",
            },
            correct: true,
            feedback: {
              ar: "استخدام تنفيذي مثالي. الإحاطة في 4 دقائق، والاستشهادات القابلة للتدقيق كسبت ثقة المجلس فوراً.",
              en: "Ideal executive use. Brief in 4 min, verifiable citations won the board immediately.",
            },
            kpiChanges: [
              { key: "clarity", label: { ar: "وضوح", en: "Clarity" }, delta: +18 },
              { key: "speed", label: { ar: "سرعة", en: "Speed" }, delta: +25 },
              { key: "trust", label: { ar: "ثقة", en: "Trust" }, delta: +10 },
            ],
          },
          {
            label: {
              ar: "تفويض مدير العمليات لتقديم الإحاطة بدلاً منك",
              en: "Delegate — let COO brief instead",
            },
            correct: false,
            feedback: {
              ar: "خطأ سياسي. المجلس يريد أن يسمع من مالك المخاطرة.",
              en: "Political misstep. The board wants to hear from the risk owner.",
            },
            kpiChanges: [{ key: "trust", label: { ar: "ثقة", en: "Trust" }, delta: -12 }],
          },
        ],
      },
      {
        headline: {
          ar: "المجلس يسأل: 'ما هو أسوأ سيناريو الأسبوع القادم؟'",
          en: "Board asks: 'What is next week's worst case?'",
        },
        briefing: {
          ar: "هذا سؤال تنبؤي، لا تاريخي. لديك 40 ثانية للردّ.",
          en: "This is a forward-looking question, not historical. You have 40 seconds to reply.",
        },
        metrics: [
          { label: { ar: "طبيعة السؤال", en: "Question type" }, value: "Forecast", tone: "warn" },
          { label: { ar: "الوقت المتاح", en: "Time to answer" }, value: "40 sec", tone: "bad" },
          { label: { ar: "ذاكرة ARIA", en: "ARIA memory" }, value: "Live", tone: "good" },
        ],
        options: [
          {
            label: {
              ar: "طلب سيناريو الأسبوع القادم مع نسبة الاحتمال من ARIA لحظياً",
              en: "Ask ARIA live: 'next-week scenario with probability'",
            },
            correct: true,
            feedback: {
              ar: "استخدام قيادي في اللحظة. الإجابة: 'تركّز المخاطر يوم الجمعة (34%) بسبب فعالية + طقس'. المجلس اطمأنّ.",
              en: "Live executive use. Answer: 'Risk clusters Friday (34%) — event + weather'. Board was satisfied.",
            },
            kpiChanges: [
              { key: "clarity", label: { ar: "وضوح", en: "Clarity" }, delta: +14 },
              { key: "trust", label: { ar: "ثقة", en: "Trust" }, delta: +12 },
            ],
          },
          {
            label: {
              ar: "تجنّب السؤال بعبارة 'سنعود إليكم'",
              en: "Deflect: 'we'll come back to you'",
            },
            correct: false,
            feedback: {
              ar: "فقدان لحظة قيادية. المجلس رأى إحجاماً، لا تحفّظاً.",
              en: "Lost leadership moment. Board read reluctance, not prudence.",
            },
            kpiChanges: [
              { key: "trust", label: { ar: "ثقة", en: "Trust" }, delta: -10 },
              { key: "clarity", label: { ar: "وضوح", en: "Clarity" }, delta: -8 },
            ],
          },
          {
            label: { ar: "تخمين تنفيذي من الذاكرة", en: "Guess from memory" },
            correct: false,
            feedback: {
              ar: "خطر تنفيذي عالٍ. رقم من الذاكرة قد يُقتبس ضدّك.",
              en: "High executive risk. A memory-number will be quoted back at you.",
            },
            kpiChanges: [{ key: "trust", label: { ar: "ثقة", en: "Trust" }, delta: -6 }],
          },
        ],
      },
    ],
    debrief: {
      ar: "الإحاطة التنفيذية العظيمة ليست خطاباً — إنها قرار مدعوم بالبيانات في أقلّ وقت ممكن. ARIA تحوّل ساعات إلى دقائق.",
      en: "Great executive briefing isn't a speech — it's a decision backed by data in the least time possible. ARIA collapses hours into minutes.",
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  "compliance-permits": {
    kind: "decision_scenario",
    initialKpis: [
      { key: "compliance", label: { ar: "الامتثال", en: "Compliance" }, value: 82 },
      { key: "velocity", label: { ar: "سرعة العمليات", en: "Ops Velocity" }, value: 68 },
      { key: "risk", label: { ar: "المخاطر القانونية", en: "Legal Risk" }, value: 35 },
    ],
    steps: [
      {
        headline: {
          ar: "طلب تصريح عمل ساخن قبل بدء الوردية بـ 20 دقيقة",
          en: "Hot-work permit request 20 min before shift start",
        },
        briefing: {
          ar: "المقاول يطلب تصريحاً للحام في منطقة تخزين وقود. الجار (خزان الغاز) بمسافة 12 متراً. المطلوب قانونياً 15 متراً.",
          en: "Contractor requests welding near fuel storage. Adjacent gas tank is 12m away. Legal minimum is 15m.",
        },
        metrics: [
          { label: { ar: "المسافة الفعلية", en: "Actual distance" }, value: "12m", tone: "bad" },
          { label: { ar: "الحدّ القانوني", en: "Legal minimum" }, value: "15m", tone: "warn" },
          {
            label: { ar: "تكلفة تأخير الوردية", en: "Shift-delay cost" },
            value: "SAR 85K",
            tone: "warn",
          },
        ],
        options: [
          {
            label: {
              ar: "منح التصريح — سنراقب عن كثب",
              en: "Grant permit — we'll monitor closely",
            },
            correct: false,
            feedback: {
              ar: "خرق قانوني موثّق. تدقيق مستقبلي سيسحب رخصة الموقع.",
              en: "Documented legal breach. A future audit will pull the site's license.",
            },
            kpiChanges: [
              { key: "compliance", label: { ar: "امتثال", en: "Compliance" }, delta: -25 },
              { key: "risk", label: { ar: "مخاطر قانونية", en: "Legal risk" }, delta: +30 },
            ],
          },
          {
            label: {
              ar: "رفض التصريح + اقتراح ARIA لموقع بديل بمسافة 22م",
              en: "Deny permit + accept ARIA's alt-location suggestion at 22m",
            },
            correct: true,
            feedback: {
              ar: "قرار تنفيذي محترف. الموقع البديل جاهز في 40 دقيقة — الامتثال محفوظ، والوردية استأنفت.",
              en: "Professional executive call. Alt-location ready in 40 min — compliance kept, shift resumed.",
            },
            kpiChanges: [
              { key: "compliance", label: { ar: "امتثال", en: "Compliance" }, delta: +12 },
              { key: "velocity", label: { ar: "سرعة", en: "Velocity" }, delta: +6 },
              { key: "risk", label: { ar: "مخاطر قانونية", en: "Legal risk" }, delta: -14 },
            ],
          },
          {
            label: { ar: "طلب استثناء من الإدارة العليا", en: "Request executive exception" },
            correct: false,
            feedback: {
              ar: "الاستثناءات على القانون ليست منتَجاً تنفيذياً — إنها تراكم مخاطر.",
              en: "Exceptions against law are not an executive product — they compound risk.",
            },
            kpiChanges: [
              { key: "risk", label: { ar: "مخاطر قانونية", en: "Legal risk" }, delta: +12 },
              { key: "velocity", label: { ar: "سرعة", en: "Velocity" }, delta: -5 },
            ],
          },
        ],
      },
    ],
    debrief: {
      ar: "الامتثال ليس عائقاً — إنه رخصة العمل. ARIA تحوّل الامتثال من احتكاك إلى مسار.",
      en: "Compliance isn't a blocker — it's your license to operate. ARIA turns compliance from friction into a path.",
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  "patrols-field-ops": {
    kind: "decision_scenario",
    initialKpis: [
      { key: "coverage", label: { ar: "التغطية الميدانية", en: "Field Coverage" }, value: 74 },
      { key: "response", label: { ar: "سرعة الاستجابة", en: "Response Speed" }, value: 66 },
      { key: "fatigue", label: { ar: "إجهاد الطواقم", en: "Team Fatigue" }, value: 40 },
    ],
    steps: [
      {
        headline: {
          ar: "3 تنبيهات متزامنة، دوريّتان فقط متاحتان",
          en: "3 concurrent alerts, only 2 patrols available",
        },
        briefing: {
          ar: "التنبيهات: (A) باب مفتوح في مستودع، (B) شخص غير معروف قرب البوابة الغربية، (C) حسّاس دخان انذار كاذب متكرّر.",
          en: "Alerts: (A) door left open in warehouse, (B) unknown person near west gate, (C) smoke sensor with frequent false alarms.",
        },
        metrics: [
          {
            label: { ar: "أولوية ARIA", en: "ARIA priority ranking" },
            value: "B > A > C",
            tone: "warn",
          },
          { label: { ar: "دوريّات متاحة", en: "Patrols available" }, value: "2", tone: "warn" },
          {
            label: { ar: "معدّل الإنذار الكاذب لـ C", en: "C false-alarm rate" },
            value: "87%",
            tone: "good",
          },
        ],
        options: [
          {
            label: {
              ar: "إرسال دوريّة لكل من A و B، وإرجاء C لبثّ CCTV",
              en: "Send patrols to A + B, defer C to CCTV live feed",
            },
            correct: true,
            feedback: {
              ar: "قرار مبنيّ على البيانات. C كان كاذباً مجدداً — ما كانت هناك حاجة لإرسال طاقم.",
              en: "Data-driven call. C was another false alarm — no crew needed.",
            },
            kpiChanges: [
              { key: "response", label: { ar: "استجابة", en: "Response" }, delta: +12 },
              { key: "coverage", label: { ar: "تغطية", en: "Coverage" }, delta: +6 },
            ],
          },
          {
            label: { ar: "توزيع الدوريّات عشوائياً", en: "Assign patrols in random order" },
            correct: false,
            feedback: {
              ar: "إهدار للأولوية. الشخص غير المعروف تسلّل قبل الوصول.",
              en: "Priority waste. Unknown person left before arrival.",
            },
            kpiChanges: [
              { key: "response", label: { ar: "استجابة", en: "Response" }, delta: -10 },
              { key: "coverage", label: { ar: "تغطية", en: "Coverage" }, delta: -8 },
            ],
          },
          {
            label: { ar: "استدعاء الوردية القادمة مبكراً", en: "Call the next shift in early" },
            correct: false,
            feedback: {
              ar: "استنزاف للطاقم لا مبرّر له في ظلّ إنذار كاذب معروف.",
              en: "Unnecessary team burnout when one alert is a known false alarm.",
            },
            kpiChanges: [
              { key: "fatigue", label: { ar: "إجهاد", en: "Fatigue" }, delta: +15 },
              { key: "coverage", label: { ar: "تغطية", en: "Coverage" }, delta: +2 },
            ],
          },
        ],
      },
    ],
    debrief: {
      ar: "الدوريات الذكية ليست أكثر عدداً — إنها أكثر توجّهاً. ARIA تحوّل التنبيه إلى أولوية، والأولوية إلى دقيقة موفّرة.",
      en: "Smart patrols aren't more people — they're more targeted people. ARIA turns alerts into priority, and priority into minutes saved.",
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  "visitor-access": {
    kind: "decision_scenario",
    initialKpis: [
      { key: "experience", label: { ar: "تجربة الزائر", en: "Visitor Experience" }, value: 76 },
      { key: "security", label: { ar: "الأمان", en: "Security" }, value: 80 },
      { key: "throughput", label: { ar: "سعة العبور", en: "Throughput" }, value: 62 },
    ],
    steps: [
      {
        headline: {
          ar: "وفد رسمي يصل بلا موعد سابق مسجّل",
          en: "Official delegation arrives with no prior appointment",
        },
        briefing: {
          ar: "8 زوّار مع دبلوماسي معروف. الاستقبال لم يستلم إشعاراً. الفعالية المقصودة تبدأ خلال 25 دقيقة.",
          en: "8 visitors with a known diplomat. Reception got no notice. Target event starts in 25 min.",
        },
        metrics: [
          {
            label: { ar: "التحقق من الهوية", en: "ID verification" },
            value: "Pending",
            tone: "warn",
          },
          { label: { ar: "الفعالية المقصودة", en: "Target event" }, value: "25 min", tone: "warn" },
          { label: { ar: "مضيف داخلي", en: "Internal host" }, value: "Not confirmed", tone: "bad" },
        ],
        options: [
          {
            label: {
              ar: "إدخالهم فوراً لتجنّب الإحراج",
              en: "Admit immediately to avoid embarrassment",
            },
            correct: false,
            feedback: {
              ar: "خرق أمني. الاحترام لا يُلغي البروتوكول.",
              en: "Security breach. Respect doesn't override protocol.",
            },
            kpiChanges: [{ key: "security", label: { ar: "أمان", en: "Security" }, delta: -18 }],
          },
          {
            label: {
              ar: "التحقّق من ARIA للمضيف الداخلي + بدء تصاريح سريعة موقّعة رقمياً",
              en: "Ask ARIA to locate internal host + start fast-track e-permits",
            },
            correct: true,
            feedback: {
              ar: "قرار تنفيذي مصقول. ARIA حدّدت المضيف، والوفد دخل خلال 8 دقائق بمعرفات صحيحة.",
              en: "Polished executive move. ARIA found the host, delegation entered in 8 min with valid IDs.",
            },
            kpiChanges: [
              { key: "experience", label: { ar: "تجربة", en: "Experience" }, delta: +10 },
              { key: "security", label: { ar: "أمان", en: "Security" }, delta: +6 },
              { key: "throughput", label: { ar: "سعة", en: "Throughput" }, delta: +8 },
            ],
          },
          {
            label: { ar: "إبعادهم حتى تأكيد مسبق", en: "Turn them away until prior confirmation" },
            correct: false,
            feedback: {
              ar: "قرار سياسياً خاطئ. حادثة دبلوماسية بلا حاجة.",
              en: "Politically wrong. A diplomatic incident with no need.",
            },
            kpiChanges: [
              { key: "experience", label: { ar: "تجربة", en: "Experience" }, delta: -20 },
            ],
          },
        ],
      },
    ],
    debrief: {
      ar: "إدارة الوصول هي المحل الأمامي للمؤسسة. ARIA تدمج التحقّق، الاحترام، والسرعة في تجربة واحدة.",
      en: "Access management is the enterprise's front-of-house. ARIA fuses verification, respect, and speed into one experience.",
    },
  },
};
