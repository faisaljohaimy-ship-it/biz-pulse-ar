// Auto-split from scenarios.ts — pure data.
import type { DecisionScenario } from "./scenarios.types";

export const SCENARIOS_A: Record<string, DecisionScenario> = {
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
};
