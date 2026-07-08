# خطة تنفيذ التوجيه النهائي — NEXIOS ARIA

الهدف: إغلاق النواقص فقط، بدون إعادة بناء، بدون تكرار، بدون كسر مسارات أو معماريّة. تنفيذ متسلسل عبر عدة جولات مع تحقق بعد كل مرحلة.

## الحالة الحالية (بعد فحص سريع)

- ✅ `AriaAudioBus` (`src/lib/aria/audio-bus.ts`) يحظر `speechSynthesis.speak` كليًا، يمرّر واحدًا في كل لحظة، يوقف على `pagehide`/إخفاء التبويب، وفيه watchdog يقتل أي صوت متصفح دخيل أثناء `chat-tts`.
- ✅ `AriaProvider` مُركَّب في `__root.tsx` مرة واحدة.
- ✅ Ledger توجيه أريا موجود على `/aria/directive` مع تحقق حي للمراحل 1–5.
- ⚠️ لا يوجد فحص وقت-تشغيل واضح "singleton hard-assert" لـ Brain / Provider / Voice / Avatar / Memory (المطلوب في P0).
- ⚠️ `ExecutionEnvelope` موجود كوحدة (`execution-envelope.ts`) لكن يحتاج ربط عرض موحّد (Summary/Risk/Priority/Confidence/Action/Approval/NextStep).
- ⚠️ Command Center موجود (`command-center.tsx`) لكن يحتاج جرد للبطاقات المطلوبة وتأكيد ربطها بمصادر حية.
- ⚠️ سيناريو Live Demo التنفيذي يحتاج مسارًا واحدًا واضحًا يخرج المغلَّف الكامل.

## الجولات (تُنفَّذ متسلسلة)

### الجولة 1 — P0 قفل الاستقرار (هذه الجولة القادمة)
1. `src/lib/aria/singletons.ts`: سجل runtime لخمسة مفردات (BRAIN, PROVIDER, VOICE, AVATAR, MEMORY) مع `assertOne(key)` يرمي في dev ويسجّل تحذيرًا في prod.
2. تسجيل المفردات من: `AriaProvider`، `voice-manager`، `avatar-runtime`، `aria-brain`، `memory-manager`.
3. تعزيز `AriaAudioBus`: عند دخول جلسة chat جديدة استدعاء `stopAll()` قبل `acquire('chat-tts')` (مضاعف حماية للـ "prevent double playback").
4. تحقق: typecheck + جولة Playwright قصيرة على الصفحة الرئيسية للتأكد أن لا تحذيرات مفرد مكررة.

### الجولة 2 — P0 مزامنة الأفاتار
1. تدقيق `avatar-state-manager` + `avatar-voice-sync` وتأكيد الحالات: `idle/listening/thinking/speaking/explaining/warning/success`.
2. ربط `AriaAudioBus.subscribe` → `avatar-state-manager.transition` (bus `playing` → `speaking`, `stopped/end` → `idle`).
3. ضبط blink/breathing/gestures القائمة (`idle-engine`, `body-engine`, `gesture-engine`) للعمل تلقائيًا في `idle`/`speaking`.

### الجولة 3 — P1 المغلَّف التنفيذي
1. مكوّن `src/components/aria/ExecutiveEnvelopeCard.tsx`: يعرض Summary/Risk/Priority/Confidence/RecommendedAction/ApprovalRequired/NextStep من `ExecutiveBrainAnswer`.
2. توصيل `AriaCopilot` لعرض المغلَّف بعد كل رد Brain (بديل عن JSON الخام).
3. زر "طلب موافقة" يُفعِّل `approval-gate` عندما `requires_human_approval=true`.

### الجولة 4 — P2 Live Demo
1. مسار `/aria/demo` (تحت `_authenticated`) يشغّل سيناريو "ما حالة العمليات الآن؟" ويعرض بالتسلسل: Summary → TopRisks → Recommended Decision → Execution Steps → Final Report.
2. يستخدم `getExecutiveBrainAnswer` الحالي + قناة صوت واحدة عبر البص.

### الجولة 5 — P3 Command Center Cards
1. جرد بطاقات `command-center.tsx` وإضافة/تفعيل المفقود من: SystemHealth, ARIAStatus, ActiveOperations, Risks, KPIs, Alerts, ExecutionQueue, RecentDecisions.
2. كل بطاقة تربط `EvidenceBadge` + `SecLiveBadge` وفق FR-19.

### الجولة 6 — UI Rules + Validation النهائي
1. مسح شامل لأي: مصطلحات مطوّر ظاهرة، JSON خام في UI، أسماء موفّرين (OpenAI/ElevenLabs...)، شرطات `—` بديلها "لا توجد بيانات مباشرة حاليًا".
2. RTL: تدقيق `dir="rtl"` على البطاقات الجديدة.
3. تحقق نهائي: `tsgo --noEmit` = 0، بناء نظيف، Playwright لثلاث صفحات (`/`, `/aria/directive`, `/command-center`)، تحديث `/aria/directive` ledger.

## التفاصيل التقنية

- كل server fn جديد يعيش في `*.functions.ts` منفصل، والمساعدات في `*.server.ts` (قاعدة splitting).
- لا تعديل على `client.ts`/`auth-attacher.ts`/`types.ts`/`.env`.
- لا `speechSynthesis` جديد نهائيًا — فقط عبر البص.
- الألوان من tokens في `src/styles.css`، لا hardcode.
- كل شارة/مقياس جديد عبر `EvidenceBadge` وفق FR-19.

## المخرجات لكل جولة
`FilesModified · FixesApplied · ARIAStatus · VoiceStatus · AvatarStatus · ExecutiveDemoStatus · CommandCenterStatus · BuildResult · TSResult · ReadinessScore`

بعد موافقتك ابدأ فورًا بالجولة 1.
