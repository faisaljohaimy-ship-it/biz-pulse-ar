# سَدِيد — الاستدلال المحليّ الاختياري: تقرير التنفيذ (٢٠٢٦/١٠/١٦)

تنفيذ «MASTER ENGINEERING EXECUTION DIRECTIVE — Hybrid AI · Local Inference ·
GPU Readiness · Zero-Cost First». الفرع: `feature/sadeed-local-inference`.
القاعدة الحاكمة: لا ادّعاء بلا قياس؛ ما لم يُقَس يُكتب **NOT TESTED**.

## 1. ما وُجد في المستودع (Phase A — مؤكَّد من الكود)

| البند | الواقع |
| --- | --- |
| الإطار | TanStack Start 1.168 + React 19 + Vite 7؛ البناء Nitro ⇐ Cloudflare Workers (`.output/server/wrangler.json`، `nodejs_compat`)؛ الناشر Lovable (مزامنة من GitHub ثم Publish صريح) |
| البيانات | Supabase (مشروع Lovable Cloud `jhutlofapjfjjeajawie`)؛ المصادقة Supabase Auth؛ RLS في القاعدة؛ عميل الخادم `src/integrations/supabase/client.server.ts` (service role) |
| مزوّد الذكاء | `ai` v6 + `@ai-sdk/google` — `gemini-3.6-flash` (القائمة البيضاء في `src/lib/ai-gateway.server.ts`، `GEMINI_MODEL` يُقبل منها فقط)؛ السياسة في `src/lib/sadeed-core/server/ai-router.server.ts` «Gemini وحده» |
| الاحتياط القائم | `src/lib/sadeed/backup-provider.server.ts` — بوّابة Lovable AI عبر `@ai-sdk/openai-compatible` (`google/gemini-3-flash-preview`) عند 429/5xx/حصّة، مع تبريد المفتاح المباشر |
| مسار الدردشة | العميل `SadeedCopilot.tsx` ⇐ `createSadeedTransport` (`sadeed-service.ts`، `DefaultChatTransport` إلى `/api/chat`، مصادَق أوّلًا ثم مجهول عند 401/403) ⇐ `src/routes/api/chat.ts` (`POST`): مفتاح الإيقاف ⇐ تحقّق الطلب (`-chat-guard.ts`) ⇐ الجلسة/المؤسسة ⇐ حدّ المعدّل + الحصّة اليومية ⇐ المسارات الفورية (نطاق/استرجاع سريع/إجابة فورية من البيانات) ⇐ السياق الحيّ وRAG (للمسجَّل) ⇐ `generateText` (مُجمَّع كاملًا، ليس بثًّا رمزًا رمزًا) ⇐ بوّابة الإخراج الآمن (`finalizeSadeedOutput`) ⇐ بثّ النصّ الآمن بصيغة UIMessage |
| الاسترجاع والذاكرة | `src/lib/sadeed/rag.server.ts` (+ `gemini-embeddings.server.ts`)، جداول `finn_*`؛ **حالة RAG: غير مطبَّق على الإنتاج** (`docs/audit/SADEED_V10_AUDIT_2026-10-12.md`) |
| الأدوات | `src/lib/sadeed-tools.server.ts` (`buildSadeedTools`) للمسجَّل فقط |
| مسارات أخرى تستدعي النموذج | `api/sadeed/chat.ts`، `api/public/sadeed-ask.ts`، `sadeed-stream.ts`، `sadeed-explain.ts`، `lib/mcp/tools/ask-sadeed.ts`، النسخ الصوتي `gemini-transcription.server.ts` |
| أسماء متغيّرات البيئة (بلا قيم) | `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`، `GEMINI_MODEL`، `GEMINI_EMBEDDING_MODEL`، `GEMINI_TRANSCRIBE_MODEL`، `LOVABLE_API_KEY`، `ELEVENLABS_API_KEY`، `SUPABASE_URL`، `SUPABASE_PUBLISHABLE_KEY`، `SUPABASE_SERVICE_ROLE_KEY`، `SADEED_MAX_OUTPUT_TOKENS`، `SADEED_AI_DISABLED`، `SADEED_CHAT_DAILY_PER_IDENTITY`، `SADEED_CHAT_DAILY_GLOBAL`، `TRUST_PROXY_HEADERS` |
| GPU / نقطة محليّة قائمة | **لا شيء**: لا `nvidia-smi`، لا `/dev/nvidia*`، لا Ollama، لا منفذ 11434، ولا ذكر في الكود |
| اختناقات الكمون (من الكود) | (أ) `generateText` مُجمَّع: أوّل بايت = نهاية التوليد؛ (ب) مجلس العشرة اختياري (`replyMode: "deep"`) — خارج الافتراضي؛ (ج) بوّابات القاعدة تسبق النموذج (عولجت في VIBE 5.1: مهلة افتراضية + قاطع)؛ (د) للمسجَّل: `auth.getUser` + `org_members` + بناء السياق قبل النموذج؛ (هـ) لا إعادة محاولة في الـSDK على المفتاح المباشر عمدًا (Retry-After طويل) |
| الاختبارات القائمة | vitest: 169 ملفًّا / 2285 اختبارًا قبل هذا العمل (عقود سلوكية ونصّية على مسار الدردشة والصوت) |

## 2. المعمارية المنفَّذة (Phase B/C)

- **محوّل مزوّد لا نسخة منطق:** `src/lib/sadeed/local-inference.server.ts` يبني
  نموذج `@ai-sdk/openai-compatible` (`/v1/chat/completions`) — الحزمة قائمة أصلًا
  للاحتياط، فلا اعتمادية جديدة ولا تكلفة. يعمل مع Ollama وvLLM وllama.cpp وأيّ
  بوّابة مكافئة.
- **مطفأ افتراضيًّا:** بلا `SADEED_LOCAL_INFERENCE_ENABLED` يبقى `/api/chat` حرفًا
  كما كان (اختبار يثبت أن النموذج الوحيد المستدعى هو المستضاف).
- **الأوضاع:** `fallback` (الافتراض عند التفعيل) = بعد المستضاف واحتياطه؛
  `primary` = المحليّ أوّلًا والمستضاف بديله. الواجهة لا تتغيّر؛ ترويسة
  `X-SADEED-Inference-Path: hosted|local` للقياس.
- **الإعداد في الخادم وحده**، ويفشل مغلقًا: بروتوكول http(s) فقط؛ لا حروف اعتماد
  ولا استعلام في العنوان؛ المضيف غير المحليّ يتطلّب TLS **و**مفتاحًا (لا خادم
  استدلال عاريًا على الإنترنت)؛ اسم النموذج بصيغةٍ مسموحة؛ المهلة [1، 60] ث
  (افتراض 20)؛ المحاولات [0، 2] (افتراض 0).
- **السلامة:** إشارة إلغاء مركّبة (إلغاء العميل + مهلة صلبة)؛ تبريد دقيقة بعد
  الفشل؛ النموذج يُبنى لكل طلب (لا حالة محادثة مشتركة)؛ السجلّ يذكر صنف المضيف
  (loopback/remote) وصنف الخطأ فقط — لا عنوان ولا مفتاح ولا نصّ خام.
- **لا يُفترض تطابق النموذجين:** نفس الرسائل والأدوات تُمرَّر؛ إن لم يدعم
  المحليّ الأدوات يفشل نداؤه ⇐ يُبرَّد ويعود المستضاف (في `fallback` تبقى رسالة
  المستضاف هي المعروضة).

**متغيّرات البيئة الجديدة (أسماء فقط):** `SADEED_LOCAL_INFERENCE_ENABLED`،
`SADEED_LOCAL_INFERENCE_BASE_URL`، `SADEED_LOCAL_INFERENCE_MODEL`،
`SADEED_LOCAL_INFERENCE_API_KEY`، `SADEED_LOCAL_INFERENCE_TIMEOUT_MS`،
`SADEED_LOCAL_INFERENCE_MAX_RETRIES`، `SADEED_LOCAL_INFERENCE_MODE`.

## 3. الملفّات المتغيّرة

| الملف | السبب |
| --- | --- |
| `src/lib/sadeed/local-inference.server.ts` (جديد) | المحوّل والإعداد والتحقّق والتبريد وأوصاف الأخطاء |
| `src/routes/api/chat.ts` | دمج المحوّل في مسار التوليد (`runHosted`/`runLocal`)، الترويسة، وتسجيل النموذج المقدَّم في `finn_interactions` كـ`local:<model>` |
| `src/lib/sadeed/local-inference.server.test.ts` (جديد) | 15 اختبارًا |
| `src/routes/api/chat-local-inference.test.ts` (جديد) | 9 اختبارات سلوكية |
| `docs/audit/SADEED_LOCAL_INFERENCE_2026-10-16.md` (هذا) | التقرير |

## 4. التشغيل محليًّا

```bash
npm ci
# المزوّد القائم (كما هو):
#   GEMINI_API_KEY=… SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… SUPABASE_SERVICE_ROLE_KEY=…
# المحرّك المحليّ (اختياري) — مثال Ollama على الجهاز نفسه:
#   ollama serve && ollama pull qwen2.5:7b-instruct
#   SADEED_LOCAL_INFERENCE_ENABLED=true
#   SADEED_LOCAL_INFERENCE_BASE_URL=http://127.0.0.1:11434/v1
#   SADEED_LOCAL_INFERENCE_MODEL=qwen2.5:7b-instruct
#   SADEED_LOCAL_INFERENCE_MODE=fallback   # أو primary
npm run dev
# بناء الإنتاج ومعاينته:
npm run build && npm run preview
```

## 5. نتائج البوابة

tsc 0 · eslint 0 أخطاء (33 تحذيرًا قديمة) · prettier نظيف · vitest **171 ملفًّا،
2309 ناجحًا، 28 متخطًّى** · `npm run build` ناجح · ميزانية الأداء داخل السقوف
(أكبر أصل JS ‏1.20/1.40 MiB، 626 ملفًّا).

## 6. القياس (Phase D)

| القياس | النتيجة |
| --- | --- |
| TTFT/الكمون الكلّي للمزوّد القائم من بيئة الجلسة | **لم يُقَس** — لا مفتاح مزوّد في بيئة الجلسة، ومنافذ الإنتاج محجوبة |
| p50/p95 الإنتاج من `finn_interactions` | **لم يُقَس** — قاعدة الإنتاج لا تردّ (504) يوم القياس |
| TTFT/الكمون/الإنتاجية للمحرّك المحليّ | **NOT TESTED** — لا GPU ولا Ollama في البيئة، وتنزيل النماذج محجوب (ollama.com/HF/registry) |
| استهلاك GPU والذاكرة | **NOT TESTED** |
| سلامة البروتوكول (رسائل، عربية، أدوات، بثّ، مهلة، إلغاء) | **مقيسة باختبارات** عبر الـSDK الحقيقي فوق `fetch` مزروع (15 + 9) |

**تحسينات كمونٍ آمنة مرصودة (غير منفَّذة هنا، تحتاج ضوابط المالك الأربعة):**
بثّ النصّ جملةً جملةً بعد بوّابة الإخراج (قرار المالك ٢٠٢٦/١٠/١١: خلف راية تُقاس)؛
مهلة لنداءي `auth.getUser`/`org_members`؛ إعادة استعمال اتصالات HTTP تقع في
المنصّة (Workers) لا في الكود.

## 7. مراجعة الأمان والمخاطر المتبقّية

- لا أسرار في العميل ولا السجلّ ولا الـcommit (اختبار يزرع مفتاحًا وعنوانًا
  ويتأكّد من غيابهما في كل سجلّات مسار الفشل).
- المضيف البعيد مرفوضٌ بلا TLS + مفتاح. **يبقى على المالك** ألا يعرّض Ollama مباشرةً
  على الإنترنت: خلف وكيلٍ مؤمَّن أو شبكةٍ خاصّة فقط.
- النموذج المحليّ قد يكون أضعف في العربية أو لا يدعم الأدوات: **جودة الردّ تُقاس
  قبل تفعيل `primary`**؛ `fallback` هو الوضع الآمن للبدء.
- بوّابة الإخراج الآمن والعقد (المادة ٢٢) تطبَّق على نصّ المحليّ كما المستضاف.

## 8. ما بقي قبل أيّ تفعيل في الإنتاج

1. عتادٌ أو خادم استدلال فعليّ (لم يُوفَّر ولم يُشترَ — بأمر التوجيه).
2. قياس TTFT/الكمون/الجودة العربية على ≥ 30 سؤالًا مقابل المستضاف.
3. تصريح `nexios-qa-guardian`، ثم النشر **بإذن المالك الصريح** (التوجيه: لا نشر بلا إذن).

## 9. منفَّذ / مختبَر / معلَّق

- **منفَّذ ومختبَر:** المحوّل، الإعداد والتحقّق، الدمج في `/api/chat` بوضعيه،
  التبريد، السجلّ بلا أسرار، عدم تغيّر الافتراض.
- **معلَّق:** قياس الأداء على عتاد حقيقي (NOT TESTED)؛ النشر (بإذن)؛ دمج الفرع في
  `main` بعد إعادة تأسيسه فوق تحصين VIBE 5.1 (يتقاطع في `chat.ts`).
