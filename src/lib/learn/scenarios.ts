/**
 * Executive scenarios for the Knowledge Bridge simulations.
 *
 * `decision_scenario` — a bilingual, multi-step executive drill. Each step
 * presents a real-world situation with live KPIs, three executive options,
 * and consequences. Correct choices increase readiness; wrong ones surface a
 * post-mortem so the executive learns from the miss.
 *
 * `digital_twin` and `knowledge_graph` have their own dedicated components.
 */

export interface Bi {
  ar: string;
  en: string;
}

export interface KpiChange {
  key: string; // machine key
  label: Bi;
  delta: number; // absolute delta applied to running KPI (0..100 clamp)
}

export interface DecisionOption {
  label: Bi;
  correct: boolean;
  feedback: Bi;
  kpiChanges: KpiChange[];
}

export interface DecisionStep {
  headline: Bi;
  briefing: Bi; // executive brief for the step
  metrics: Array<{ label: Bi; value: string; tone?: "good" | "warn" | "bad" }>;
  options: DecisionOption[];
}

export interface DecisionScenario {
  kind: "decision_scenario";
  initialKpis: Array<{ key: string; label: Bi; value: number }>; // 0..100
  steps: DecisionStep[];
  debrief: Bi; // shown at the end
}

export const DECISION_SCENARIOS: Record<string, DecisionScenario> = {
  // ────────────────────────────────────────────────────────────────────────
  "predictive-risk": {
    kind: "decision_scenario",
    initialKpis: [
      { key: "risk", label: { ar: "مؤشّر المخاطر", en: "Risk Index" }, value: 42 },
      { key: "readiness", label: { ar: "الجاهزية", en: "Readiness" }, value: 68 },
      { key: "cost", label: { ar: "كفاءة التكلفة", en: "Cost Efficiency" }, value: 74 },
    ],
    steps: [
      {
        headline: {
          ar: "ارتفاع تدريجي في درجة الحرارة بغرفة المحوّلات",
          en: "Gradual temperature climb in transformer room",
        },
        briefing: {
          ar: "ترصد ARIA ارتفاعاً في حرارة المحوّل بمعدل 0.4 درجة/ساعة على مدى 6 ساعات، مع تذبذب في القراءات الاهتزازية. لا يوجد إنذار حرج، لكن النمط يطابق 84% من الأعطال السابقة.",
          en: "ARIA detects a 0.4°C/hour rise on a transformer over 6 hours, with vibration jitter. No critical alarm yet, but the pattern matches 84% of prior failure signatures.",
        },
        metrics: [
          {
            label: { ar: "الاحتمالية التنبؤية", en: "Predictive probability" },
            value: "84%",
            tone: "warn",
          },
          {
            label: { ar: "الوقت المتوقّع للفشل", en: "Time-to-failure" },
            value: "18–36h",
            tone: "warn",
          },
          {
            label: { ar: "التكلفة عند الفشل", en: "Cost if failure" },
            value: "SAR 1.2M",
            tone: "bad",
          },
        ],
        options: [
          {
            label: {
              ar: "تجاهل التنبيه — لا يوجد إنذار حرج",
              en: "Dismiss — no critical alarm yet",
            },
            correct: false,
            feedback: {
              ar: "قرار خاطئ. التنبيه التنبؤي مصمّم للتحرّك قبل الوصول إلى الحد الحرج. الفشل التالي كلّف مليون ريال وأدّى إلى توقف الإنتاج لـ 9 ساعات.",
              en: "Wrong call. Predictive alerts are designed to act before the critical threshold. The next failure cost SAR 1M and 9 hours of downtime.",
            },
            kpiChanges: [
              { key: "risk", label: { ar: "مخاطر", en: "Risk" }, delta: +18 },
              { key: "readiness", label: { ar: "الجاهزية", en: "Readiness" }, delta: -15 },
            ],
          },
          {
            label: {
              ar: "جدولة صيانة وقائية في نافذة صيانة الليل",
              en: "Schedule preventive maintenance in night window",
            },
            correct: true,
            feedback: {
              ar: "قرار تنفيذي صحيح. الصيانة في نافذة منخفضة الحمل تجنّبت التوقف، ووفّرت 1.1 مليون ريال، وحسّنت مؤشّر الجاهزية.",
              en: "Correct executive call. Maintenance in a low-load window avoided the outage, saved SAR 1.1M, and improved readiness.",
            },
            kpiChanges: [
              { key: "risk", label: { ar: "مخاطر", en: "Risk" }, delta: -20 },
              { key: "readiness", label: { ar: "الجاهزية", en: "Readiness" }, delta: +12 },
              { key: "cost", label: { ar: "كفاءة التكلفة", en: "Cost Efficiency" }, delta: +6 },
            ],
          },
          {
            label: {
              ar: "إيقاف المحوّل فوراً واستدعاء طاقم الطوارئ",
              en: "Shut down transformer now and dispatch emergency crew",
            },
            correct: false,
            feedback: {
              ar: "ردّ فعل مبالَغ فيه. إيقاف الإنتاج بلا داعٍ كلّف 340 ألف ريال في ساعات إنتاج فُقدت.",
              en: "Overreaction. An unnecessary shutdown cost SAR 340K in lost production hours.",
            },
            kpiChanges: [
              { key: "cost", label: { ar: "كفاءة التكلفة", en: "Cost Efficiency" }, delta: -14 },
              { key: "readiness", label: { ar: "الجاهزية", en: "Readiness" }, delta: -4 },
            ],
          },
        ],
      },
      {
        headline: {
          ar: "تنبّؤ ARIA بذروة استهلاك في يوم الجمعة",
          en: "ARIA forecasts a Friday peak demand",
        },
        briefing: {
          ar: "توقّع ARIA يشير إلى ارتفاع 22% في الأحمال يوم الجمعة القادم، متزامناً مع فعالية اجتماعية بالموقع. الطاقة الاحتياطية الحالية تكفي لـ 91% من السيناريو الأسوأ.",
          en: "ARIA forecasts a 22% load spike next Friday, coinciding with an on-site event. Current reserve covers 91% of the worst case.",
        },
        metrics: [
          { label: { ar: "الأحمال المتوقّعة", en: "Projected load" }, value: "+22%", tone: "warn" },
          { label: { ar: "تغطية الاحتياطي", en: "Reserve coverage" }, value: "91%", tone: "warn" },
          { label: { ar: "دقة التنبّؤ", en: "Forecast accuracy" }, value: "94%", tone: "good" },
        ],
        options: [
          {
            label: { ar: "استئجار مولّد احتياطي إضافي مسبقاً", en: "Pre-rent a backup generator" },
            correct: true,
            feedback: {
              ar: "قرار مضبوط. تكلفة الاستئجار 42 ألف ريال، أقلّ بكثير من مخاطرة انقطاع خلال فعالية VIP.",
              en: "Well-calibrated. SAR 42K rental beats risking a VIP-event outage.",
            },
            kpiChanges: [
              { key: "risk", label: { ar: "مخاطر", en: "Risk" }, delta: -10 },
              { key: "readiness", label: { ar: "الجاهزية", en: "Readiness" }, delta: +8 },
              { key: "cost", label: { ar: "كفاءة", en: "Cost" }, delta: -3 },
            ],
          },
          {
            label: {
              ar: "المضيّ دون تحرّك — الاحتياطي يكفي عادة",
              en: "Do nothing — reserve is usually enough",
            },
            correct: false,
            feedback: {
              ar: "قرار محفوف بالمخاطر. 9% احتمال انقطاع خلال فعالية عالية الحساسية غير مقبول تنفيذياً.",
              en: "Risky. A 9% blackout probability during a high-profile event is not executively acceptable.",
            },
            kpiChanges: [
              { key: "risk", label: { ar: "مخاطر", en: "Risk" }, delta: +8 },
              { key: "readiness", label: { ar: "الجاهزية", en: "Readiness" }, delta: -6 },
            ],
          },
          {
            label: { ar: "تأجيل الفعالية", en: "Postpone the event" },
            correct: false,
            feedback: {
              ar: "غير مبرَّر. المخاطر قابلة للإدارة بحلّ تشغيلي أرخص وأقل ضجيجاً تنفيذياً.",
              en: "Unjustified. The risk is manageable with a cheaper operational fix.",
            },
            kpiChanges: [{ key: "cost", label: { ar: "كفاءة", en: "Cost" }, delta: -8 }],
          },
        ],
      },
    ],
    debrief: {
      ar: "الذكاء التنبؤي لا يعني القرار — يعني قرار أفضل. مهمّتك التنفيذية هي وزن التكلفة/المخاطرة، لا مطاردة كل تنبيه.",
      en: "Predictive intelligence isn't the decision — it's a better decision. Your executive job is weighing cost against risk, not chasing every alert.",
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  "industrial-security-ops": {
    kind: "decision_scenario",
    initialKpis: [
      { key: "posture", label: { ar: "الوضع الأمني", en: "Security Posture" }, value: 72 },
      { key: "compliance", label: { ar: "الامتثال", en: "Compliance" }, value: 88 },
      { key: "morale", label: { ar: "معنويات الفرق", en: "Team Morale" }, value: 70 },
    ],
    steps: [
      {
        headline: {
          ar: "دخول مركبة مقاول دون تصريح مسبق",
          en: "Contractor vehicle enters without pre-authorization",
        },
        briefing: {
          ar: "كاميرا البوابة الشمالية رصدت شاحنة مقاول تدخل بلوحة تطابق قائمتنا لكن دون تصريح صادر لهذا اليوم. السائق يدّعي أن التصريح 'قادم عبر البريد'.",
          en: "North-gate camera catches a contractor truck with a plate matching our roster but no permit issued for today. Driver claims the permit is 'coming via email'.",
        },
        metrics: [
          { label: { ar: "توافق اللوحة", en: "Plate match" }, value: "✓", tone: "good" },
          { label: { ar: "تصريح اليوم", en: "Today's permit" }, value: "None", tone: "bad" },
          {
            label: { ar: "منطقة الوجهة", en: "Destination zone" },
            value: "Turbine Hall",
            tone: "warn",
          },
        ],
        options: [
          {
            label: {
              ar: "السماح بالدخول لعدم تعطيل جدول المقاول",
              en: "Allow entry — don't disrupt the contractor schedule",
            },
            correct: false,
            feedback: {
              ar: "خرق للامتثال. التصريح المسبق ليس بيروقراطياً — إنه سلسلة المساءلة إذا حدث حادث.",
              en: "Compliance breach. Pre-authorization is not bureaucracy — it's the accountability chain if an incident happens.",
            },
            kpiChanges: [
              { key: "compliance", label: { ar: "امتثال", en: "Compliance" }, delta: -18 },
              { key: "posture", label: { ar: "وضع", en: "Posture" }, delta: -10 },
            ],
          },
          {
            label: {
              ar: "احتجاز عند البوابة، تفعيل تصريح طارئ عبر ARIA خلال 3 دقائق",
              en: "Hold at gate, fast-track permit via ARIA in 3 min",
            },
            correct: true,
            feedback: {
              ar: "الخيار التنفيذي الصحيح. إجراء صارم بلا تعطيل — ARIA أصدرت تصريحاً موقّعاً رقمياً في 2:14 دقيقة.",
              en: "Correct executive move. Rigor without disruption — ARIA issued a signed permit in 2:14.",
            },
            kpiChanges: [
              { key: "compliance", label: { ar: "امتثال", en: "Compliance" }, delta: +6 },
              { key: "posture", label: { ar: "وضع", en: "Posture" }, delta: +8 },
              { key: "morale", label: { ar: "معنويات", en: "Morale" }, delta: +4 },
            ],
          },
          {
            label: {
              ar: "رفض المركبة وإرسالها للمكتب البعيد",
              en: "Reject the vehicle back to the far office",
            },
            correct: false,
            feedback: {
              ar: "قاسٍ بلا داعٍ. تسبّب في تأخير 4 ساعات وخسارة إنتاج لأن التصريح كان جاهزاً فعلاً في النظام.",
              en: "Needlessly harsh. Caused a 4-hour delay because the permit was in fact ready in the system.",
            },
            kpiChanges: [{ key: "morale", label: { ar: "معنويات", en: "Morale" }, delta: -8 }],
          },
        ],
      },
      {
        headline: {
          ar: "تنبيه CCTV: حركة داخل مستودع المواد الخطرة بعد ساعات العمل",
          en: "CCTV alert: motion inside hazardous-materials store after hours",
        },
        briefing: {
          ar: "تحليل ARIA للحركة: 78% ثقة أنه شخص واحد، 22% أنه حيوان. لا بطاقة وصول مُسجّلة. أقرب دورية على بُعد 4 دقائق.",
          en: "ARIA motion analysis: 78% confidence single human, 22% animal. No badge scan. Nearest patrol 4 min away.",
        },
        metrics: [
          {
            label: { ar: "ثقة الاكتشاف", en: "Detection confidence" },
            value: "78% human",
            tone: "warn",
          },
          { label: { ar: "أقرب دورية", en: "Nearest patrol" }, value: "4 min", tone: "warn" },
          { label: { ar: "خطر المواد", en: "Material hazard" }, value: "Class 3", tone: "bad" },
        ],
        options: [
          {
            label: { ar: "تنبيه المدير فقط والانتظار", en: "Notify manager only, wait" },
            correct: false,
            feedback: {
              ar: "بطء غير مقبول لمنطقة خطرة. البروتوكول يستدعي دورية فورية.",
              en: "Unacceptable latency for a hazardous zone. Protocol demands immediate dispatch.",
            },
            kpiChanges: [
              { key: "posture", label: { ar: "وضع", en: "Posture" }, delta: -12 },
              { key: "compliance", label: { ar: "امتثال", en: "Compliance" }, delta: -6 },
            ],
          },
          {
            label: {
              ar: "إرسال دورية + قفل تلقائي للأبواب + بثّ مباشر لغرفة التحكّم",
              en: "Dispatch patrol + auto-lock doors + live-stream to control room",
            },
            correct: true,
            feedback: {
              ar: "استجابة تنفيذية طبقية. تبيّن أنه فنّي منسيّ على قائمة الإخلاء — تمّ التحقّق بأمان.",
              en: "Layered executive response. Turned out to be a technician missed on the evac list — safely verified.",
            },
            kpiChanges: [
              { key: "posture", label: { ar: "وضع", en: "Posture" }, delta: +12 },
              { key: "compliance", label: { ar: "امتثال", en: "Compliance" }, delta: +5 },
            ],
          },
          {
            label: { ar: "استدعاء الشرطة فوراً", en: "Call police immediately" },
            correct: false,
            feedback: {
              ar: "قفزة سابقة لأوانها. البروتوكول يبدأ بتحقّق داخلي؛ استدعاء الشرطة بلا داعٍ يستنزف الثقة الخارجية.",
              en: "Premature escalation. Protocol starts with internal verification; unnecessary police calls erode external trust.",
            },
            kpiChanges: [
              { key: "morale", label: { ar: "معنويات", en: "Morale" }, delta: -5 },
              { key: "posture", label: { ar: "وضع", en: "Posture" }, delta: -2 },
            ],
          },
        ],
      },
    ],
    debrief: {
      ar: "العمليات الصناعية الآمنة لا تعني القسوة — تعني إجراءات متسقة، سريعة، وقابلة للتدقيق. ARIA تضمن الثلاثة.",
      en: "Safe industrial ops aren't about being harsh — they're about consistent, fast, auditable process. ARIA delivers all three.",
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  "emergency-response": {
    kind: "decision_scenario",
    initialKpis: [
      { key: "life", label: { ar: "سلامة الأرواح", en: "Life Safety" }, value: 92 },
      { key: "time", label: { ar: "زمن الاستجابة", en: "Response Time" }, value: 60 },
      { key: "coord", label: { ar: "التنسيق", en: "Coordination" }, value: 70 },
    ],
    steps: [
      {
        headline: {
          ar: "حريق في الوحدة الفرعية للمعدّات الميكانيكية",
          en: "Fire in mechanical sub-unit",
        },
        briefing: {
          ar: "كاشف الدخان + كاميرا حرارية أكّدا حريقاً في الطابق الأرضي. 14 موظفاً في الطابق العلوي. طاقم الإطفاء في الموقع بعد 6 دقائق.",
          en: "Smoke sensor + thermal cam confirm ground-floor fire. 14 staff on the floor above. Fire crew on-site in 6 min.",
        },
        metrics: [
          { label: { ar: "أشخاص في خطر", en: "People at risk" }, value: "14", tone: "bad" },
          { label: { ar: "وقت وصول الإطفاء", en: "Fire crew ETA" }, value: "6 min", tone: "warn" },
          {
            label: { ar: "مسارات الإخلاء الآمنة", en: "Safe evac paths" },
            value: "2 of 3",
            tone: "warn",
          },
        ],
        options: [
          {
            label: {
              ar: "انتظار وصول طاقم الإطفاء لإصدار أمر الإخلاء",
              en: "Wait for fire crew to authorize evacuation",
            },
            correct: false,
            feedback: {
              ar: "تأخير قاتل محتمل. سلطة الإخلاء داخلية عندما يكون التهديد مؤكداً. فقدت دقيقتين حرجتين.",
              en: "Potentially fatal delay. Evac authority is internal when threat is confirmed. Lost 2 critical minutes.",
            },
            kpiChanges: [
              { key: "life", label: { ar: "سلامة", en: "Life" }, delta: -15 },
              { key: "time", label: { ar: "وقت", en: "Time" }, delta: -20 },
            ],
          },
          {
            label: {
              ar: "إخلاء فوري عبر المسارين الآمنين + توجيه ARIA للطاقم عبر الاتصال المباشر",
              en: "Evacuate now via 2 safe paths + ARIA guides staff via live comms",
            },
            correct: true,
            feedback: {
              ar: "قرار قيادي. ARIA وجّهت 14 موظفاً في 3:20 دقيقة، مع خارطة تُحدَّث لحظياً حسب انتشار الدخان.",
              en: "Command-quality decision. ARIA guided all 14 out in 3:20, with a live-updating map as smoke spread.",
            },
            kpiChanges: [
              { key: "life", label: { ar: "سلامة", en: "Life" }, delta: +6 },
              { key: "time", label: { ar: "وقت", en: "Time" }, delta: +25 },
              { key: "coord", label: { ar: "تنسيق", en: "Coordination" }, delta: +15 },
            ],
          },
          {
            label: {
              ar: "إخلاء المبنى بأكمله دون إعطاء الأولوية للطابق المُهدَّد",
              en: "Evacuate the entire building without prioritizing the at-risk floor",
            },
            correct: false,
            feedback: {
              ar: "تدفّق فوضوي. الطابق العلوي عالق خلف الدرج الرئيسي مع الآخرين — تأخّر الوصول 90 ثانية.",
              en: "Chaotic outflow. The at-risk floor got trapped behind the main stair with everyone else — 90-sec delay.",
            },
            kpiChanges: [
              { key: "life", label: { ar: "سلامة", en: "Life" }, delta: -6 },
              { key: "coord", label: { ar: "تنسيق", en: "Coordination" }, delta: -8 },
            ],
          },
        ],
      },
      {
        headline: {
          ar: "بعد الإخلاء: فرد مفقود من قائمة الحضور",
          en: "Post-evac: one person missing from headcount",
        },
        briefing: {
          ar: "13 من 14 خارج المبنى بأمان. آخر ظهور لـ 'م. الأحمدي' على بطاقة الوصول: 08:14 في القسم الميكانيكي. الدخان يملأ الطابق الأرضي.",
          en: "13 of 14 safely outside. 'M. Alahmadi' last badge-scan 08:14 in mechanical wing. Smoke fills ground floor.",
        },
        metrics: [
          { label: { ar: "خارج بأمان", en: "Safely out" }, value: "13/14", tone: "warn" },
          {
            label: { ar: "آخر موقع مؤكّد", en: "Last known" },
            value: "Mech wing 08:14",
            tone: "bad",
          },
          {
            label: { ar: "الرؤية للمنقذين", en: "Rescuer visibility" },
            value: "< 2m",
            tone: "bad",
          },
        ],
        options: [
          {
            label: {
              ar: "توجيه فرق الإطفاء مباشرة إلى آخر موقع مسجّل",
              en: "Direct firefighters straight to last badge location",
            },
            correct: true,
            feedback: {
              ar: "دقيق تنفيذياً. البيانات الحيّة من ARIA وفّرت 4–6 دقائق بحث في الدخان.",
              en: "Executively precise. ARIA's live badge data saved 4–6 minutes of smoke-search.",
            },
            kpiChanges: [
              { key: "life", label: { ar: "سلامة", en: "Life" }, delta: +8 },
              { key: "time", label: { ar: "وقت", en: "Time" }, delta: +10 },
            ],
          },
          {
            label: {
              ar: "بدء بحث في كل الطوابق بترتيب عشوائي",
              en: "Start random floor-by-floor search",
            },
            correct: false,
            feedback: {
              ar: "إهدار للحياة. البيانات موجودة — استخدمها.",
              en: "Life-wasting. Data exists — use it.",
            },
            kpiChanges: [
              { key: "life", label: { ar: "سلامة", en: "Life" }, delta: -10 },
              { key: "time", label: { ar: "وقت", en: "Time" }, delta: -15 },
            ],
          },
          {
            label: { ar: "إعادة عدّ الحضور فقط", en: "Just re-count the headcount" },
            correct: false,
            feedback: {
              ar: "شلل. البيروقراطية في لحظة الأزمة تكلّف الأرواح.",
              en: "Paralysis. Bureaucracy in a crisis costs lives.",
            },
            kpiChanges: [
              { key: "life", label: { ar: "سلامة", en: "Life" }, delta: -18 },
              { key: "time", label: { ar: "وقت", en: "Time" }, delta: -12 },
            ],
          },
        ],
      },
    ],
    debrief: {
      ar: "الاستجابة للطوارئ هي مسرح تنفيذي بالثواني. ARIA تحوّل البيانات الفوضوية إلى قرار واحد واضح — لكن السلطة تبقى لك.",
      en: "Emergency response is executive theater in seconds. ARIA turns chaos into one clear decision — but authority stays with you.",
    },
  },

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
