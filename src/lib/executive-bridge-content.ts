export type ExecutiveBridgeAccent = "navy" | "emerald" | "gold";

export type ExecutiveBridgeSceneId =
  | "command-pulse"
  | "decision-engine"
  | "regional-grid"
  | "aria-council"
  | "digital-twin"
  | "sovereign-trust"
  | "activation";

export interface ExecutiveBridgeSceneCopy {
  id: ExecutiveBridgeSceneId;
  kicker_ar: string;
  kicker_en: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  narration_ar: string;
  narration_en: string;
  accent: ExecutiveBridgeAccent;
  showSimRibbon?: boolean;
}

/**
 * The public bridge is deliberately a seven-chapter executive story rather
 * than a feature catalogue. Simulated operational values remain explicitly
 * labelled in the visuals; narration never presents them as production facts.
 */
export const EXECUTIVE_BRIDGE_SCENES = [
  {
    id: "command-pulse",
    kicker_ar: "لحظة القيادة",
    kicker_en: "Command Pulse",
    title_ar: "كل ما يهم القيادة. في لحظة واحدة.",
    title_en: "Everything leadership needs. In one decisive moment.",
    body_ar:
      "نبض تنفيذي موحّد يحوّل الإشارات المتفرقة إلى موقف واضح، أولوية مفهومة، وقرار قابل للتنفيذ.",
    body_en:
      "A unified executive pulse that turns scattered signals into clarity, priority, and action.",
    narration_ar:
      "مرحباً بكم في جسر القيادة التنفيذي لنيكسيوس. أنا آريا، شريكتكم الذكية في القرار. أمامكم الآن نموذج توضيحي لنبض المؤسسة؛ صورة واحدة تجمع الجاهزية، والمخاطر، والعمليات، وتضع الأهم أولاً. لا مزيد من البحث بين الشاشات أو انتظار التقارير. أنا أقرأ الإشارات، أوضح معناها، وأقدّم للقيادة موقفاً مختصراً قابلاً للتحقق. هنا تبدأ القيادة الحديثة: حقيقة واضحة، في الوقت المناسب، أمام الشخص المخوّل بالقرار.",
    narration_en:
      "Welcome to the NEXIOS Executive Command Bridge. I am ARIA, your intelligent decision partner. This demonstration brings readiness, risk, and operations into one verifiable executive pulse. Instead of searching across disconnected screens or waiting for reports, leadership receives the signal, its meaning, and the priority that requires attention. Modern command begins here: clear truth, at the right moment, in front of the person authorized to act.",
    accent: "navy",
    showSimRibbon: true,
  },
  {
    id: "decision-engine",
    kicker_ar: "محرك القرار",
    kicker_en: "Decision Engine",
    title_ar: "من الإشارة إلى القرار الموثّق.",
    title_en: "From signal to governed decision.",
    body_ar:
      "الأمن والسلامة والصيانة يعملون داخل مسار قرار واحد؛ بالأدلة، والصلاحيات، ومسؤولية بشرية واضحة.",
    body_en:
      "Security, safety, and maintenance converge in one evidence-led, human-authorized decision path.",
    narration_ar:
      "في جسر القيادة، لا تبقى الإشارة مجرد تنبيه. يربط نيكسيوس البلاغ بسياقه التشغيلي، ويقارن أثره على الأمن والسلامة والصيانة، ثم أقدّم أنا، آريا، توصية مفسّرة مع الأدلة ودرجة الثقة. يبقى الاعتماد للإنسان المخوّل دائماً. وبعد الموافقة، يتحول القرار إلى تكليف واضح، بمالك ووقت مستهدف ومسار تدقيق كامل. النتيجة ليست سرعة بلا حوكمة؛ بل سرعة مسؤولة يمكن قياسها ومراجعتها.",
    narration_en:
      "On the Command Bridge, a signal never remains a passive alert. NEXIOS connects it to operational context, evaluates its impact across security, safety, and maintenance, and I present an explained recommendation with evidence and confidence. Authorization always remains with the accountable human. Once approved, the decision becomes a traceable assignment with an owner, a target time, and a complete audit path. This is not speed without governance; it is responsible speed that can be measured and reviewed.",
    accent: "emerald",
    showSimRibbon: true,
  },
  {
    id: "regional-grid",
    kicker_ar: "الشبكة الإقليمية",
    kicker_en: "Regional Grid",
    title_ar: "أربع مناطق. قيادة واحدة. هوية حيّة لكل قطاع.",
    title_en: "Four regions. One command. A living identity for every sector.",
    body_ar:
      "الوسطى، الغربية، الشرقية، والجنوبية تتصل في صورة وطنية واحدة مع احتفاظ كل منطقة بلونها وسياقها.",
    body_en:
      "Central, Western, Eastern, and Southern operations unite without losing regional context.",
    narration_ar:
      "تمتد الرؤية التنفيذية عبر المناطق الأربع من دون أن تفقد كل منطقة هويتها. الوسطى بالأزرق الملكي، الغربية بالسيان الكهربائي، الشرقية بالأخضر، والجنوبية بالذهبي الكهرماني. عند الانتقال إلى أي منطقة، يتغير السياق والمؤشرات وحواف الأوامر فوراً، بينما تبقى القيادة قادرة على المقارنة ضمن مشهد وطني واحد. القيم المعروضة هنا محاكاة توضيحية، أما البنية فمصممة لاستقبال بيانات التشغيل الحقيقية عند الربط والإطلاق.",
    narration_en:
      "Executive visibility extends across all four regions without erasing local identity. Central is royal blue, Western electric cyan, Eastern green, and Southern amber gold. Selecting a region changes context, indicators, and command edges instantly, while leadership retains one national comparison surface. The values shown here are clearly labelled demonstration data; the architecture is prepared to receive authorized operational sources when connected and commissioned.",
    accent: "emerald",
    showSimRibbon: true,
  },
  {
    id: "aria-council",
    kicker_ar: "مجلس آريا",
    kicker_en: "ARIA Council",
    title_ar: "ذكاء تنفيذي يعمل مع القيادة، لا بدلاً عنها.",
    title_en: "Executive intelligence that works with leadership, never around it.",
    body_ar:
      "وكلاء متخصصون يجمعون الأدلة ويصيغون الخيارات، وآريا توحّد الصورة قبل بوابة الاعتماد البشري.",
    body_en:
      "Specialist agents assemble evidence and options; ARIA unifies the picture before human approval.",
    narration_ar:
      "أنا آريا، ولست صندوق محادثة منفصلاً عن العمل. أعمل داخل منظومة من الوكلاء المتخصصين: وكيل للمخاطر، وآخر للعمليات، وثالث للتقارير، ورابع للمتابعة. أجمع نتائجهم في موجز واحد، أشرح سبب كل توصية، وأكشف ما هو مؤكد وما يحتاج إلى تحقق. يمكنكم مخاطبتي صوتياً لأجيب بصوتي، أو الكتابة لأجيب نصياً، كما أستطيع تجهيز الرسائل والمرفقات وتنفيذ الإرسال بعد أمر صريح وصلاحية معتمدة.",
    narration_en:
      "I am ARIA, and I am not a chat box detached from the work. I operate with specialist agents for risk, operations, reporting, and follow-through. I unify their findings into one brief, explain the reason behind every recommendation, and distinguish verified evidence from what still needs confirmation. Speak to me and I respond by voice; write to me and I respond in text. I can also prepare messages and attachments, executing delivery only after an explicit instruction and an authorized approval path.",
    accent: "navy",
    showSimRibbon: true,
  },
  {
    id: "digital-twin",
    kicker_ar: "التوأم التشغيلي",
    kicker_en: "Operational Twin",
    title_ar: "الميدان يصبح مفهوماً قبل أن يصبح أزمة.",
    title_en: "Understand the field before a signal becomes a crisis.",
    body_ar:
      "الأصول، المواقع، الفرق، والحوادث تتقاطع في توأم تشغيلي يوضح الحالة والأثر والخطوة التالية.",
    body_en:
      "Assets, sites, teams, and incidents converge in an operational twin that exposes impact and next action.",
    narration_ar:
      "يحوّل التوأم التشغيلي البيانات إلى سياق بصري مفهوم. الموقع لا يظهر كنقطة فقط؛ بل كعلاقة بين أصل وحالة وفريق ومخاطر محتملة. أراقب الانحرافات، أقارنها بالحدود المعتمدة، وأصوغ للقيادة سؤال القرار الصحيح: ماذا حدث، لماذا يهم، من يتولى المعالجة، وما الزمن المتوقع؟ ومن المشهد نفسه يمكن إنشاء تقرير تنفيذي جاهز للمجلس، مع فصل واضح بين البيانات الحقيقية وأي محاكاة أو تقدير.",
    narration_en:
      "The operational twin turns data into understandable context. A site is no longer just a point; it becomes a relationship between an asset, its condition, the responsible team, and potential risk. I detect deviations, compare them with approved thresholds, and frame the decision leadership actually needs: what happened, why it matters, who owns the response, and when resolution is expected. The same surface can produce a board-ready brief while clearly separating verified facts from simulation or estimation.",
    accent: "emerald",
    showSimRibbon: true,
  },
  {
    id: "sovereign-trust",
    kicker_ar: "الثقة السيادية",
    kicker_en: "Sovereign Trust",
    title_ar: "كل قرار محمي. كل إجراء قابل للتفسير.",
    title_en: "Every decision protected. Every action explainable.",
    body_ar:
      "حوكمة الصلاحيات، عزل البيانات، سجل التدقيق، والموافقة البشرية جزء من التجربة وليست إضافات لاحقة.",
    body_en:
      "Authorization, data isolation, auditability, and human approval are built into the experience.",
    narration_ar:
      "الثقة هنا ليست عبارة تسويقية؛ إنها سلوك تقني واضح. يرى كل مستخدم ما تسمح به صلاحياته فقط، وتبقى بيانات الجهات معزولة، وتسجّل الأفعال الحساسة دون كشف محتوى خاص في السجلات. لا أرسل بريداً أو رسالة نصية من تلقاء نفسي، ولا أحوّل اقتراحاً إلى تنفيذ. أطلب البيانات الناقصة، أعرض معاينة واضحة، وأنتظر الأمر الصريح من صاحب الصلاحية. بهذه الضوابط يصبح الذكاء الاصطناعي قابلاً للاعتماد داخل بيئة تنفيذية وسيادية.",
    narration_en:
      "Trust here is not a marketing phrase; it is explicit system behavior. Every user sees only what their role permits, organizational data remains isolated, and sensitive actions are audited without exposing private content in logs. I do not send an email or text message on my own, and I never turn a suggestion into execution. I request missing details, present a clear preview, and wait for an explicit instruction from an authorized person. These controls make artificial intelligence dependable in executive and sovereign environments.",
    accent: "gold",
  },
  {
    id: "activation",
    kicker_ar: "القرار التالي",
    kicker_en: "Next Decision",
    title_ar: "من الرؤية إلى قيمة قابلة للقياس خلال تسعين يوماً.",
    title_en: "From vision to measurable value in ninety days.",
    body_ar:
      "نبدأ بنطاق حاسم، نربط مصادر موثوقة، ونقيس الأثر قبل التوسع — بفريق تفعيل ومسؤوليات واضحة.",
    body_en:
      "Start with one decisive scope, connect trusted sources, prove impact, then scale with clear ownership.",
    narration_ar:
      "الخطوة التالية عملية ومحددة. خلال الأيام الثلاثين الأولى نختار حالة استخدام تنفيذية، نثبت الصلاحيات، ونحدد خط الأساس. في المرحلة الثانية نربط المصادر المعتمدة ونشغّل الجسر مع المستخدمين المخوّلين. وفي المرحلة الثالثة نقيس زمن القرار، وجودة الاستجابة، والجهد الذي تم توفيره، ثم نعرض نتيجة واضحة للتوسع أو التحسين. أنا آريا، وسأرافق القيادة من أول سؤال إلى آخر دليل. عندما تكونون مستعدين، يبدأ جسر القيادة من قرار واحد جيد التصميم.",
    narration_en:
      "The next step is practical and defined. In the first thirty days, we select one executive use case, establish authorization, and record the baseline. In the second phase, we connect approved sources and operate the bridge with authorized users. In the third, we measure decision time, response quality, and effort saved, then present a clear recommendation to scale or improve. I am ARIA, and I will support leadership from the first question to the final evidence. When you are ready, the Command Bridge begins with one well-designed decision.",
    accent: "gold",
  },
] as const satisfies readonly ExecutiveBridgeSceneCopy[];

export function executiveBridgeNarration(
  scene: ExecutiveBridgeSceneCopy,
  language: "ar" | "en",
): string {
  return language === "ar" ? scene.narration_ar : scene.narration_en;
}
